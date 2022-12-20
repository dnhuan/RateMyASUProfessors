const AUTHORIZATION_TOKEN = "Basic dGVzdDp0ZXN0";
const SCHOOL_IDS = [
	"U2Nob29sLTQ1",
	"U2Nob29sLTEzMjcx",
	"U2Nob29sLTEzNDgz",
	"U2Nob29sLTEzNjQ3",
	"U2Nob29sLTE3MTA4",
];
const PROFESSOR_ID = `
query ($query: TeacherSearchQuery!) {
    newSearch {
        teachers(query: $query) {
            edges {
                node {
                	id
                }
            }
        }
    }
}
`;

const PROFESSOR_DATA = `
query ($id: ID!) {
    node(id: $id) {
        ... on Teacher {
            id
            department
            legacyId
            firstName
            lastName
            avgRating
            numRatings
            avgDifficulty
            wouldTakeAgainPercent
        }
    }
}
`;

const queryProfID = async function queryProfIDAsync(profName, sendResponse) {
	try {
		let response = null;

		for (let i = 0; i < SCHOOL_IDS.length; i++) {
			const SCHOOL_ID = SCHOOL_IDS[i];
			const raw_response = await fetch(
				"https://www.ratemyprofessors.com/graphql",
				{
					method: "POST",
					headers: {
						Authorization: AUTHORIZATION_TOKEN,
					},
					body: JSON.stringify({
						query: PROFESSOR_ID,
						variables: {
							query: { text: profName, schoolID: SCHOOL_ID },
						},
					}),
				}
			);

			response = await raw_response.json();
			if (response.data.newSearch.teachers.edges.length !== 0) {
				break;
			}
		}

		sendResponse(response);
	} catch (error) {
		sendResponse(new Error(error));
	}
};

// const profDataCache = new Map();

const fetchProfData = (profID) => {
	return fetch("https://www.ratemyprofessors.com/graphql", {
		method: "POST",
		headers: {
			Authorization: AUTHORIZATION_TOKEN,
		},
		body: JSON.stringify({
			query: PROFESSOR_DATA,
			variables: {
				id: profID,
			},
		}),
	});
};

const queryProfData = async function queryProfDataAsync(profID, sendResponse) {
	try {
		const raw_response = await fetchProfData(profID);

		const response = await raw_response.json();
		sendResponse(response);
	} catch (error) {
		sendResponse(new Error(error));
	}
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	switch (request.contentScriptQuery) {
		case "queryProfID":
			queryProfID(request.profName, sendResponse);
			return true;

		case "queryProfData":
			queryProfData(request.profID, sendResponse);
			return true;

		default:
			return true;
	}
});
