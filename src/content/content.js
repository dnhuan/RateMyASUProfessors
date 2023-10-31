window.addEventListener("load", waitForFirstLoad, false);

function waitForFirstLoad() {
	let tableTimer = setInterval(checkForTableInDOM, 50);

	function checkForTableInDOM() {
		if (document.getElementsByClassName("class-results").length > 0) {
			clearInterval(tableTimer);
			startObserver();
		}
	}
}

function log(message) {
	// console.log(`%cRMAP`, "color: #26bfa5;", message);
}

function startObserver() {
	log("Page fully loaded");
	// trigger first time
	onRenderHandler();

	// Set mutation observer on loading spinner to wait for table reload
	// TODO: Check for table on page load
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			// check if a node is removed in this mutation
			if (mutation.removedNodes.length > 0) {
				// check if the removed node is the loading spinner
				if (
					mutation.removedNodes[0].className?.includes(
						"spinner-button"
					)
				) {
					log("Loading spinner removed");
					// wait for table to load
					setTimeout(() => {
						log("Table loaded");
						onRenderHandler();
					}, 100);
				}
			}
		});
	});

	const reactRootDOM = document.getElementById("root");

	observer.observe(reactRootDOM, { subtree: true, childList: true });
}

function onRenderHandler() {
	// check if there is h1 tag with content "No classes found"
	if ($('h2:contains("No classes found")').length > 0) {
		log("NONE");
		return;
	}
	log("FOUND");

	// Set up RMP column
	addRMPCol();

	// for each row, get each row, fetch data, append data
	processResultTable();
}

function addRMPCol() {
	$(".class-results-rows")[0].style.gridTemplateColumns = "repeat(15, 1fr)";

	if ($(".class-results-header-cell.rmp").length == 0) {
		let placeholderHeader = $("<div>")
			.addClass("class-results-header-cell")
			.addClass("rmp")
			.text("RMP");
		$(".instructor.class-results-header-cell").after(placeholderHeader);
	}

	let tableRows = $(".course");
	for (row of tableRows) {
		$(row).css("grid-column-start", "1");
	}
}

function processResultTable() {
	let allRows = $(".class-accordion");
	for (row of allRows) {
		// if class rmp cell does not exist, create it and append to row, after instructor cell
		if ($(row).children(".rmp").length == 0) {
			let placeholder = $("<div>")
				.addClass("class-results-cell")
				.addClass("rmp")
				.text("Loading reviews...");
			$(row).children(".instructor").after(placeholder.clone());
		}
		processCurrentRow(row);
	}
}

async function processCurrentRow(row) {
	let instructorDiv = $(row).children(".instructor").first();
	if (instructorDiv.text().includes("Staff")) {
		$(row).children(".rmp").empty();

		$(row).children(".rmp").first().text("N/A");
		return;
	}

	let profNameList = parseProfNameList(instructorDiv);
	let profReviewList = await Promise.all(
		profNameList.map((profName) => getReview(profName))
	);
	log(profReviewList);
	$(row).children(".rmp").empty();

	let hasNext = false;
	for (profReview of profReviewList) {
		if (profReview === null) {
			$(row).children(".rmp").first().append($("<p>").text("N/A"));
			continue;
		}

		//check if comma is neccessary
		const currentIndex = profReviewList.indexOf(profReview);
		hasNext =
			profReviewList[currentIndex + 1] !== undefined &&
			profReviewList[currentIndex + 1] !== null;

		// Insert score into DOM
		let HydratedProfScoreComp = ProfReviewComp(profReview, hasNext);
		$(row).children(".rmp").first().append(HydratedProfScoreComp);
	}
}

function parseProfNameList(instructorDiv) {
	if (instructorDiv.children("span").length == 0) {
		// only one prof
		return [instructorDiv.text()];
	}
	let nameSpanList = instructorDiv.children("span").first().children("a");
	return nameSpanList.map((i, nameSpan) => $(nameSpan).text()).toArray();
}

function isNameSimilar(profName, queryName) {
	let rmpName = `${queryName.firstName} ${queryName.lastName}`;
	let simlilarity = stringSimilarity.compareTwoStrings(profName, rmpName);
	return simlilarity >= 0.8;
}

async function getReview(profName) {
	let profID = await fetchProfIDFromName(profName);
	let profReview = await fetchProfReviewFromID(profID);

	if (profReview === null || !isNameSimilar(profName, profReview)) {
		return null;
	}

	profReview["name"] = profName;

	return profReview;
}

function ProfReviewComp(profData, hasNext) {
	if (profData.numRatings == 0) {
		return `<a target="_blank" href="https://www.ratemyprofessors.com/ShowRatings.jsp?tid=${profData.legacyId}">N/A</a>`;
	}
	let colorCode = "";
	if (profData.avgRating < 2.5) {
		colorCode = "#FF9C9C";
	} else if (profData.avgRating < 3.5) {
		colorCode = "#FFD700";
	} else {
		colorCode = "#03C03C";
	}

	if (hasNext) {
		addComma = ", ";
	} else {
		addComma = " ";
	}

	const divFormat = `
	<div class="prof-container">
	<a style="text-decoration: none;" target="_blank" href="https://www.ratemyprofessors.com/ShowRatings.jsp?tid=${
		profData.legacyId
	}">
	<div>
          <span class="prof-anchor" style="color:${colorCode}; font-size:1.5em; font-weight: bold;">${
		profData.avgRating
	}</span><span style="color:black;">${addComma}</span>
    </div>
	</a>
	<div class="prof-info" >
	<div class="prof-namebox">${
		profData.name
	} <span style="color:${colorCode}; font-weight: bold;">${
		profData.avgRating
	}</span>/5</div>
	<div>${profData.avgDifficulty} difficulty</div>
	<div>${profData.wouldTakeAgainPercent.toFixed(0)}% would take again</div>
	<div>${profData.numRatings} rating(s)</div>
	</div>
	</div>
  `;

	return divFormat;
}

async function fetchProfIDFromName(name) {
	try {
		let response = await sendMessage({
			contentScriptQuery: "queryProfID",
			profName: name,
		});
		let profID = response.data.newSearch.teachers.edges[0].node.id;
		return profID;
	} catch (error) {
		return null;
	}
}

async function fetchProfReviewFromID(ID) {
	if (ID === null) {
		return null;
	}
	try {
		let response = await sendMessage({
			contentScriptQuery: "queryProfData",
			profID: ID,
		});
		let profData = response.data.node;
		return profData;
	} catch (error) {
		return null;
	}
}

function sendMessage(message) {
	return new Promise((resolve, _) => {
		chrome.runtime.sendMessage(message, (res) => {
			resolve(res);
		});
	});
}
