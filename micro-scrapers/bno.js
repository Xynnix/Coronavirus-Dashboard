const axios = require("axios");
const csv = require("csvtojson");
const globals = require("../globals");
const time = require("../getTime");
const utilities = require("../utilities");
const fs = require("fs");

const keyOrders = {
  USA: [
    "index ",
    "country ",
    "cases ",
    "new_cases ",
    "deaths ",
    "new_deaths ",
    "death_rate ",
    "serious ",
    "recovered "
  ],
  Global: [
    "index ",
    "country ",
    "cases ",
    "new_cases ",
    "deaths ",
    "new_deaths ",
    "death_rate ",
    "serious ",
    "recovered "
  ],
  China: [
    "index ",
    "country ",
    "cases ",
    "deaths ",
    "serious ",
    "critical ",
    "recovered ",
    "mystery "
  ],
  Canada: [
    "index ",
    "country ",
    "cases ",
    "new_cases ",
    "deaths ",
    "new_deaths ",
    "death_rate ",
    "serious ",
    "recovered "
  ],
  Australia: [
    "index ",
    "country ",
    "cases ",
    "new_cases ",
    "deaths ",
    "new_deaths ",
    "death_rate ",
    "serious ",
    "recovered "
  ],
  LatinAmerica: [
    "index ",
    "country ",
    "cases ",
    "deaths ",
    "serious ",
    "recovered ",
    "critical ",
    "mystery "
  ]
};

const keyMapping = {
  country: "country ",
  cases: "cases ",
  deaths: "deaths ",
  recovered: "recovered ",
  serious: "serious ",
  new_cases: "todayCases",
  new_deaths: "todayDeaths"
};

exports.fetchData = region => {
  console.log(`[SYNC] Fetching ${region.sheetName}`);
  return axios({
    method: "get",
    url: utilities.getExternalCSV(region.sheetName),
    responseType: "text"
  }).then(response => {
    return csv()
      .fromString(response.data)
      .then(json => {
        return generatedRegionalData(
          json,
          region.startKey,
          region.totalKey,
          region.sheetName
        );
      })
      .catch(error => {
        return error
      });
  });
};

const removeEmptyRows = data => {
  return data.filter(row => !!row["country "]);
};

const gatherCategoryIndexes = (order, data) => {
  return order.map(key =>
    data.findIndex(element => {
      return element["country "] === key;
    })
  );
};

const gatherBetweenRows = (startKey, endKey, data) => {
  return data.slice(startKey + 1, endKey);
};

const hasValidKeys = (region, sheetName) => {
  const receivedKeys = Object.keys(region);
  return keyOrders[sheetName].every((key, index) => {
    return receivedKeys[index] === keyOrders[sheetName][index];
  });
};

const generatedRegionalData = (data, startKey, totalKey, sheetName) => {
  const sanitiziedData = removeEmptyRows(data);
  const rowOrder = [startKey, totalKey];
  const rowIndexes = gatherCategoryIndexes(rowOrder, sanitiziedData);
  let sortedData = {
    regions: gatherBetweenRows(rowIndexes[0], rowIndexes[1], sanitiziedData),
    regionTotal: sanitiziedData.find(element => {
      return element["country "] === totalKey;
    })
  };
  if (!hasValidKeys(sortedData.regions[0], sheetName)) return false;
  sortedData.regionName = sheetName;
  sortedData.lastUpdated = time.setUpdatedTime();
  sortedData.regionTotal = utilities.remapKeys(
    sortedData.regionTotal,
    keyMapping
  );
  sortedData.regions = sortedData.regions.map(region => {
    return utilities.remapKeys(region, keyMapping);
  });
  sortedData.regions = utilities.renameCountryLabels(sortedData.regions);
  sortedData.regions.map(region => {
    region.serious = region.serious === "N/A" ? "0" : region.serious;
  });

  if (sheetName === "Global") {
    sortedData = extractCountryFromRegion("Queue", "Global", sortedData);
  }

  return sortedData;
};

const extractCountryFromRegion = (country, region, data) => {
  const targetCountryIndex = data.regions
    .map(region => {
      return region.country;
    })
    .indexOf(country);

  const targetCountry = data.regions[targetCountryIndex];
  data.regions.splice(targetCountryIndex, 1);

  return data;
};
