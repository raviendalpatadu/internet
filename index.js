const express = require("express");
const NetworkSpeed = require("network-speed"); // ES5
const ping = require("ping");
const testNetworkSpeed = new NetworkSpeed();
const path = require("path");
const { type } = require("os");
const axios = require("axios");
const API_KEY = "d319718eb37a42b9859ccda86864bf99";
const IP = require("ip");

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "scources")));

async function getNetworkDownloadSpeed() {
  const baseUrl = "https://eu.httpbin.org/stream-bytes/500000";
  const fileSizeInBytes = 50000000;
  let speed;
  try {
    speed = await testNetworkSpeed.checkDownloadSpeed(
      baseUrl,
      fileSizeInBytes
    );
    return speed;
  } catch (Error) {
    console.log("error ekak down speed eke: " + Error);
  }
  return speed;
}

async function getNetworkUploadSpeed() {
  const options = {
    hostname: "www.facebook.com",
    port: 80,
    path: "/catchers/544b09b4599c1d0200000289",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const fileSizeInBytes = 2000000;
    const upspeed = await testNetworkSpeed.checkUploadSpeed(
      options,
      fileSizeInBytes
    );
    return upspeed;
  } catch (Error) {
    console.log("error ekak up speed eke: " + Error);
  }
}

async function getPing() {
  var hosts = ["google.com", "yahoo.com", "facebook.com"];
  var sum = 0;
  var loss = 0;
  try {
    for (let host of hosts) {
      // WARNING: -i 2 argument may not work in other platform like windows
      let res = await ping.promise.probe(host, {
        timeout: 1,
      });

      sum = sum + res.time;
      loss += parseInt(res.packetLoss);
    }

    var avg = sum / hosts.length;
    loss = loss / hosts.length;
    var result = { avg: avg, loss: loss };
    return result;
  } catch (error) {
    console.log("error ekak ping eke: " + error);
    result = { avg: 0, loss: 0 };
    return result;
  }
}

async function getLocation(req, res) {
  try {
    var ipAddr = req.headers["x-forwarded-for"];
    if (ipAddr) {
      var list = ipAddr.split(",");
      console.log(ipAddr);
      ipAddr = list[list.length - 1];
    } else {
      ipAddr = req.connection.remoteAddress;
    }

    let location = axios
      .get(
        "https://api.ipgeolocation.io/ipgeo?apiKey=" + API_KEY
      )
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        console.log("error in geolocation api: " + error);
      });

    return location;
  } catch (error) {
    console.log("error ekak getloc() eke" + error);
  }
}

app.get("/", async function (req, res) {
  try{
    let locData = await getLocation(req, res);
  
    res.render("index", {
      ispName: locData.isp,
      ipAddress: locData.ip_address,
      ispOrg: locData.organization,
      city: locData.city,
      region: locData.state_prov,
      country: locData.country_name,
    });
  }
  catch(error){
    console.log("error ekak / eke" + error);
    res.render("index", {
      ispName: "Error",
      ipAddress: "---",
      ispOrg: "Error",
      city: "---",
      region: "---",
      country: "---",
      btnDisable : true,
    });
  }
});

app.get("/checkspeed", async function (req, res) {
  try {
    let ups = await getNetworkDownloadSpeed();

    let downs = await getNetworkUploadSpeed();

    let ping = await getPing();

    let locationData = await getLocation(req, res);

    const data = {
      upspeed: ups.mbps,
      downspeed: downs.mbps,
      ping: ping,
      profile: {
        ip_address: locationData.ip,
        isp_name: locationData.organization,
      },
      ISP: {
        name: locationData.organization,
        city: locationData.city,
        region: locationData.state_prov,
        country: locationData.country_name,
      },
    };

    res.send(data);
  } catch (error) {
    console.log("error ekak /checkspeed eke" + error);
    res.render("index", {
      ispName: "Error",
      ipAddress: "---",
      ispOrg: "Error",
      city: "---",
      region: "---",
      country: "---",
    });
  }
});

if (require.main === module) {
  app.listen(port, () => console.log(`Example app listening on port ${port}!`));
}

module.exports = {
  getNetworkDownloadSpeed,
  getNetworkUploadSpeed,
  getPing,
  getLocation,
  app,
};
