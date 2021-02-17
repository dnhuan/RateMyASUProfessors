window.addEventListener("load", waitForTableFetch, false);

function waitForTableFetch() {
  let tableTimer = setInterval(checkForTableInDOM, 50);

  function checkForTableInDOM() {
    if (document.querySelector("#CatalogList")) {
      clearInterval(tableTimer);
      main();
    }
  }
}

function main() {
  console.log("Page fully loaded");

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
  if (profName.split(" ")[0].indexOf(queryName.firstName) != -1) {
    if (profName.split(" ")[1].indexOf(queryName.lastName) != -1) {
      return true;
    }
  }
  if (queryName.firstName.indexOf(profName.split(" ")[0]) != -1) {
    if (queryName.lastName.indexOf(profName.split(" ")[1]) != -1) {
      return true;
    }
  }
  return false;
}

async function fetchAndAppendProfData(name, profNameList) {
  let profID = await fetchProfID(name);
  if (profID === null) {
    console.log("Professor ID not found: ", name);
    return;
  }
  let profData = await fetchProfDataFromID(profID);
  if (profData === null) {
    console.log("Professor data not found: ", name);
    return;
  }

  // display data on frontend
  profNameList.forEach((prof) => {
    if (compareProfName(prof.name, profData)) {
      appendProfDataToDOM(prof.domElem, profData);
    } else {
      // unmatch
    }
  });
}

function appendProfDataToDOM(domElem, profData) {
  let colorCode = "";
  if (profData.avgRating < 2.5) {
    colorCode = "#FF9C9C";
  } else if (profData.avgRating < 3.5) {
    colorCode = "#FFFF68";
  } else {
    colorCode = "#68FFBE";
  }
  const divFormat = `<div style="background-color:${colorCode}">
  <a style="color:blue" href="https://www.ratemyprofessors.com/ShowRatings.jsp?tid=${
    profData.legacyId
  }">
    <div>Average rating: ${profData.avgRating}</div>
    <div>Rating count: ${profData.numRatings}</div>
    <div>Average difficulty: ${profData.avgDifficulty}</div>
    <div>${profData.wouldTakeAgainPercent.toFixed(2)}% would take again</div>
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
