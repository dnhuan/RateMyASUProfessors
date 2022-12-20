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
	console.log(`%cRMAP`, "color: #26bfa5;", message);
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
	addRMPCol();
}

function addRMPCol() {
	$(".class-results-rows")[0].style.gridTemplateColumns = "repeat(15, 1fr)";
	let placeholderHeader = $("<div>")
		.addClass("class-results-cell")
		.text("RMP");
	$(".instructor.class-results-header-cell").after(placeholderHeader);

	let placeholder = $("<div>")
		.addClass("class-results-cell")
		.text("Loading reviews...");
	$(".instructor.class-results-cell").after(placeholder);
}

function getDataFromDOM() {
	let domList = [];
	let profDataSet = [];

	// Get all rows from table
	$("#CatalogList > tbody > tr").each((idx, elm) => {
		domList.push(elm);
	});

	// Parse professors data - get name
	let profNameList = domList.map((elm) => {
		let profName = parseProfName(elm);
		if (profDataSet.indexOf(profName) == -1) {
			profDataSet.push(profName);
		}
		return {
			domElem: elm,
			name: parseProfName(elm),
		};
	});

	// Process data set
	profDataSet.map((prof) => fetchAndAppendProfData(prof, profNameList));
}

function parseProfName(elm) {
	let raw = elm.className;
	let rawData = raw.split("-");
	return `${rawData[4]} ${rawData[5]}`;
}

function compareProfName(profName, queryName) {
	let simlilarity = stringSimilarity.compareTwoStrings(
		profName,
		`${queryName.firstName} ${queryName.lastName}`
	);
	if (simlilarity >= 0.8) {
		return true;
	}
	return false;
}

async function fetchAndAppendProfData(name, profNameList) {
	let profID = await fetchProfID(name);
	let profData = await fetchProfDataFromID(profID);
	if (profData === null) {
		console.log("Professor data not found: ", name);
		return;
	}

	// display data on frontend
	profNameList.forEach((prof) => {
		if (compareProfName(prof.name, profData)) {
			appendProfDataToDOM(prof.domElem, profData);
		}
	});
}

function appendProfDataToDOM(domElem, profData) {
	if (profData.numRatings == 0) {
		return;
	}
	let colorFont = "#0F0F0F";
	let colorCode = "";
	if (profData.avgRating < 2.5) {
		colorCode = "#FF9C9C";
	} else if (profData.avgRating < 3.5) {
		colorCode = "#FFFF68";
	} else {
		colorCode = "#68FFBE";
	}
	const divFormat = `<div style="background-color:${colorCode}">
  <a style="color:${colorFont}" target="_blank" href="https://www.ratemyprofessors.com/ShowRatings.jsp?tid=${
		profData.legacyId
	}">
    <div><span style="font-size:2em;font-weight: bold;">${
		profData.avgRating
	}</span>/5</div>
    <div>Average difficulty: ${profData.avgDifficulty}</div>
    <div>${profData.wouldTakeAgainPercent.toFixed(0)}% would take again</div>
    <div>${profData.numRatings} rating(s)</div>
  </a>
  </div>`;

	$(domElem).find(".instructorListColumnValue").append(divFormat);
}

async function fetchProfID(name) {
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

async function fetchProfDataFromID(ID) {
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
			console.log(JSON.stringify(res));
			resolve(res);
		});
	});
}
