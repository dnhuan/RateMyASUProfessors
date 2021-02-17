const AUTHORIZATION_TOKEN = "Basic dGVzdDp0ZXN0";
const SCHOOL_ID = "U2Nob29sLTQ1";
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.contentScriptQuery) {
    case "queryProfID":
      fetch("https://www.ratemyprofessors.com/graphql", {
        method: "POST",
        headers: {
          Authorization: AUTHORIZATION_TOKEN,
        },
        body: JSON.stringify({
          query: PROFESSOR_ID,
          variables: {
            query: { text: request.profName, schoolID: SCHOOL_ID },
          },
        }),
      })
        .then((res) => res.json())
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse(new Error(err)));
      return true;

    case "queryProfData":
      fetch("https://www.ratemyprofessors.com/graphql", {
        method: "POST",
        headers: {
          Authorization: AUTHORIZATION_TOKEN,
        },
        body: JSON.stringify({
          query: PROFESSOR_DATA,
          variables: {
            id: request.profID,
          },
        }),
      })
        .then((res) => res.json())
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse(new Error(err)));
      return true;
    default:
      return true;
  }
});
