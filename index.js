const axios = require('axios');

const _openems_last = async function(node) {
  let postdata = {
    "method": "getEdgesChannelsValues",
    "params": {
      "ids": [node.config.openems_femsid],
      "channels": [
      "_sum/GridBuyActiveEnergy",
      "_sum/GridSellActiveEnergy",
      "_sum/ProductionActiveEnergy"
    ]
    }
  }
  try {
  let result = await axios.post("https://fenecon.de/fems/rest/jsonrpc",postdata,{
                 auth: {
                   username: node.config.openems_username,
                   password: node.config.openems_password
               }});
  result = result.data;

  return result;
  } catch(e) {
    console.log(e);
    return;
  }
}

const _openems_history = async function(node,from,to,resolution) {
  let postdata = {
      "method": "edgeRpc",
      "params": {
          "edgeId": node.config.openems_femsid,
          "payload": {
            "method": "queryHistoricTimeseriesData",
            "params": {
              "edgeId": node.config.openems_femsid,
              "channels": [
                "_sum/GridBuyActiveEnergy",
                "_sum/GridSellActiveEnergy",
                "_sum/ProductionActiveEnergy"
              ],
              "resolution": resolution,
              "timezone": -2,
              "fromDate": new Date(from).toISOString().substr(0,10),
              "toDate": new Date(to).toISOString().substr(0,10)
            }
          }
      }
  }
  try {
  let result = await axios.post("https://fenecon.de/fems/rest/jsonrpc",postdata,{
                 auth: {
                   username: node.config.openems_username,
                   password: node.config.openems_password
               }});
  result = result.data;

  return result.result.payload.result;
  } catch(e) {
    console.log(e);
    return;
  }
}

module.exports = {
  last_reading: function(meterId,node) {
      return new Promise(async function (resolve, reject)  {
        let fieldin = node.config.openems_feedin_field;
        let fieldout = node.config.openems_feedout_field;
        let measurement = node.config.openems_feedin_measurement;

        if(meterId == node.config.openems_prod_field) {
          fieldin = node.config.openems_prod_field;
          delete fieldout;
          measurement = node.config.openems_prod_measurement;
        }

        let scaleFactor = 1000*10000000;

        let result = await _openems_last(node);

        if((typeof node.config !== 'undefined') && (typeof node.config.scaleFactor !== 'undefined')) scaleFactor = node.config.scaleFactor;
          if(typeof result.result[node.config.openems_femsid] == 'undefiend') {
              reject("No Measurement / No access");
          } else {
            result = result.result[node.config.openems_femsid];
            let responds = {
                time: new Date().getTime(),
                values: {
                  energy: Math.round(result[fieldin] * scaleFactor),
                  energyOut: Math.round(result[fieldout] * scaleFactor)
                }
            };
            resolve(responds);
          }
        }).catch(err => {
          reject(err.stack);
        });
  },
  historicReading: async function(meterId,resolution,from,to,node) {
    return new Promise(async function (resolve, reject)  {
      if(typeof node.config == 'undefined') node.config = node;
      let scaleFactor = 1000*10000000;
      if(typeof node.config.scaleFactor !== 'undefined') scaleFactor = node.config.scaleFactor;
      let fieldin = node.config.openems_feedin_field;
      let fieldout = node.config.openems_feedout_field;

      if(meterId == node.config.prodMeterId) {
        fieldin = node.config.openems_prod_field;
        fieldout = node.config.openems_prod_field;
        // delete fieldout;
      }

      if((typeof node.config !== 'undefined') && (node.config.scaleFactor !== 'undefined')) scaleFactor = node.config.scaleFactor;
      resolution=60;
      if(to-from>3600) resolution=900;
      if(to-from>86400) resolution=900;
      if(to-from>86400*7) resolution=900*4;
      if(to-from>86400*30) resolution=900*12;
      if(to-from>86400*120) resolution=900*24;
      let result = await _openems_history(node,from,to,resolution);

      if(result.timestamps.length < 2) {
        resolve([]);
      } else {
        let responds = [];
        let startIdx = -1;
        let endIdx = result.timestamps.length-1;
        let last_fieldin = null;
        let last_fieldout = null;
        for(let i=0;(i<result.timestamps.length);i++) {
          if((new Date(result.timestamps[i]).getTime() >= from)&&(startIdx == -1)) startIdx = i;
          // Dirty hack to emulate "last" behaviour
          if(result.data[fieldin][i] == null) {
            result.data[fieldin][i] = last_fieldin;
          } else {
            last_fieldin = result.data[fieldin][i];
          }
          if(result.data[fieldout][i] == null) {
            result.data[fieldout][i] = last_fieldout;
          } else {
            last_fieldout = result.data[fieldout][i];
          }
        }

        for(let i=startIdx;i<=endIdx;i++) {
          responds.push({
              time: new Date(result.timestamps[i]).getTime(),
              values: {
                energy: Math.round(result.data[fieldin][i] * scaleFactor),
                energyOut: Math.round(result.data[fieldout][i] * scaleFactor)
              }
          });
        }
        resolve(responds);
      }
    });
  },
  meters: async function(node) {
    let responds = [];
    responds.push({
      meterId:node.config.openems_feedin_field,
      firstMeasurementTime:0,
      location: {
        country: 'DE',
        zip: node.config.zip
      }
    });
    responds.push({
      meterId:node.config.openems_feedout_field,
      firstMeasurementTime:0,
      location: {
        country: 'DE',
        zip: node.config.zip
      }
    });
    responds.push({
      meterId:node.config.openems_prod_field,
      firstMeasurementTime:0,
      location: {
        country: 'DE',
        zip: node.config.zip
      }
    });
    return responds;
  }
};
