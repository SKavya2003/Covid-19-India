const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json()); // To parse JSON data in request body

const covid19IndiaDataFilePath = path.join(__dirname, "covid19India.db");
const sqliteDBDriver = sqlite3.Database;

let covid19IndiaDBConnectionObj = null;

const initializeDBAndServer = async () => {
  try {
    covid19IndiaDBConnectionObj = await open({
      filename: covid19IndiaDataFilePath,
      driver: sqliteDBDriver,
    });

    app.listen(3000, () => {
      console.log("Server running and listening on port 3000 !");
    });
  } catch (exception) {
    console.log(`Error initializing DB or Server: ${exception.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

/*
    End-Point 1: GET /states
    ------------
    To all states data from the
    state table in sqlite database
*/

app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `
    SELECT 
        *
    FROM
        state;
    `;

  const allStatesData = await covid19IndiaDBConnectionObj.all(
    getAllStatesQuery
  );
  const processedStatesData = allStatesData.map((singleStateData) => ({
    stateId: singleStateData.state_id,
    stateName: singleStateData.state_name,
    population: singleStateData.population,
  }));

  response.send(processedStatesData);
});

/*
    End-Point 2: GET /states/:stateId
    -----------
    To fetch specific state data with
    id: stateId from state table in
    sqlite database
*/
app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;

  const getSpecificStateDataQuery = `
    SELECT
        *
    FROM
        state
    WHERE
        state_id = ${stateId};
    `;

  const specificStateData = await covid19IndiaDBConnectionObj.get(
    getSpecificStateDataQuery
  );
  const processedSpecificStateData = {
    stateId: specificStateData.state_id,
    stateName: specificStateData.state_name,
    population: specificStateData.population,
  };

  response.send(processedSpecificStateData);
});

/*
    End-Point 3: POST /districts
    ------------
    To add new district data to
    the district table
*/
app.post("/districts", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const addNewDistrictData = `
    INSERT INTO
        district (district_name, state_id, cases, cured, active, deaths)
    VALUES
        ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});
    `;

  const addNewDistrictDataDBResponse = await covid19IndiaDBConnectionObj.run(
    addNewDistrictData
  ); // response obj has primary key
  // of new data row in the property
  // lastID
  response.send("District Successfully Added");
});

/*
    End-Point 4: GET /districts/:districtId
    ------------
    To fetch specific district data from
    district table
*/
app.get("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;

  const getSpecificDistrictDataQuery = `
    SELECT
        *
    FROM
        district
    WHERE
        district_id = ${districtId};
    `;

  const specificDistrictData = await covid19IndiaDBConnectionObj.get(
    getSpecificDistrictDataQuery
  );
  const processedSpecificDistrictData = {
    districtId: specificDistrictData.district_id,
    districtName: specificDistrictData.district_name,
    stateId: specificDistrictData.state_id,
    cases: specificDistrictData.cases,
    cured: specificDistrictData.cured,
    active: specificDistrictData.active,
    deaths: specificDistrictData.deaths,
  };

  response.send(processedSpecificDistrictData);
});

/*
    End-Point 5: DELETE /districts/:districtId
    ------------
    To delete specific district data
    with id: districtId from the district
    table
*/
app.delete("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;

  const deleteSpecificDistrictDataQuery = `
    DELETE FROM
        district
    WHERE
        district_id = ${districtId};
    `;

  await covid19IndiaDBConnectionObj.run(deleteSpecificDistrictDataQuery);
  response.send("District Removed");
});

/*
    End-Point 6: PUT /districts/:districtId
    ------------
    To update data of specific district
    in the district table
*/
app.put("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const updateSpecificDistrictDataQuery = `
    UPDATE district
    SET
        district_name = '${districtName}',
        state_id = ${stateId},
        cases = ${cases},
        cured = ${cured},
        active = ${active},
        deaths = ${deaths}
    WHERE
        district_id = ${districtId};
    `;

  await covid19IndiaDBConnectionObj.run(updateSpecificDistrictDataQuery);
  response.send("District Details Updated");
});

/*
    End-Point 7: /states/:stateId/stats
    ------------
    To fetch aggregated stats of covid-19
    cases for all districts in the specific
    state with id: stateId, from the district
    table
*/
app.get("/states/:stateId/stats", async (request, response) => {
  const { stateId } = request.params;

  const getAggregatedStatsOfSpecificStateQuery = `
    SELECT
        SUM(cases) AS total_cases,
        SUM(cured) AS total_cured,
        SUM(active) AS total_active,
        SUM(deaths) AS total_deaths
    FROM
        district
    WHERE
        state_id = ${stateId};
    `;

  const aggregatedStatsForSpecificState = await covid19IndiaDBConnectionObj.get(
    getAggregatedStatsOfSpecificStateQuery
  );
  const processedAggregatedStatsForSpecificState = {
    totalCases: aggregatedStatsForSpecificState.total_cases,
    totalCured: aggregatedStatsForSpecificState.total_cured,
    totalActive: aggregatedStatsForSpecificState.total_active,
    totalDeaths: aggregatedStatsForSpecificState.total_deaths,
  };

  response.send(processedAggregatedStatsForSpecificState);
});

/*
    End-Point 8: /districts/:districtId/details
    ------------
    To fetch the name of the state that specific
    district is part of, with id: districtId
*/
app.get("/districts/:districtId/details", async (request, response) => {
  const { districtId } = request.params;

  const getStateNameForSpecificDistrictQuery = `
    SELECT 
        DISTINCT state.state_name
    FROM
        state
    INNER JOIN
        district
    ON
        state.state_id = district.state_id
    WHERE
        district.district_id = ${districtId};
    `;

  const stateNameForSpecificDistrict = await covid19IndiaDBConnectionObj.get(
    getStateNameForSpecificDistrictQuery
  );
  const processedStateNameForSpecificDistrict = {
    stateName: stateNameForSpecificDistrict.state_name,
  };

  response.send(processedStateNameForSpecificDistrict);
});

module.exports = app;