// ==UserScript==
// @name         SolaxTemperature
// @namespace    https://solaxcloud.com/
// @version      0.1
// @description  try to take over the world!
// @author       https://github.com/danieltoledo/solax-temperature
// @match        *://solaxcloud.com/*
// @match        *://www.solaxcloud.com/*
// @icon         https://www.solaxcloud.com/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_addElement
// @run-at      document-end

// ==/UserScript==

const urlInverter =
  "https://www.solaxcloud.com/phoebus/device/getInverterFromRedis";
const inverterSerialStorgeName = "selRow_inverter_sn";
const currentTokenStorgeName = "token";
const wifiSerialStorageName = "selRow_wifi_sn";
const intervalTimeChecker = 1000 * 300; // 300 seconds

class DomUpdateService {
  privateField;

  SetStyle() {
    GM_addStyle(`
    .real-time-display .box-right-one { left: 670px; }
    .real-time-display .box-right-one { float: right; margin: 0 10px; margin-top: -30px; padding: 4px 15px; min-width: 120px;
        background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOoAAABsBAMAAACWUzO4AAAAHlBMVEXt7e3u7u7////t7e3CwsLY2NjX19fT09Pm5ubV1dVYGAzpAAAAA3RSTlPmiAZNIN+6AAAA0klEQVRo3u3bwQkCMRSE4UA60ArsIBIEC4g2sGbVs0W8AjxYgAfbVcTDLng0b8D8w4M9Dsl+yS1hFbN30iIss3/WIQpaU8iKdNe6PZ8ErTez6+uzKZfWM209mg3v1qH1TFsfZnf/Hf6stX3ql//aPkViuEjO69jr3eSWKmmdaxr/urVfw1ViuEg0FQxjGMMYxjCGMYxhDGMYwxjGMIYxjGEMYxjDGMYwhjGMYQxjGMMYxjCGMYxhDGP4t4YPe6eZt+6cptdbopPWKChNolcGkhcVT9hOAybNAI8gAAAAAElFTkSuQmCC) no-repeat;
        background-size: 100% 100%; }
    .real-time-display .box-right-one  tr:first-child td{ text-align: center; font-size: 15px; line-height: 25px; }
    .real-time-display .box-right-one  tr:last-child td{ text-align: center; line-height: 23px; }
    .real-time-display .cap-size { font-size: 16px; color: #fb870f; }`);
  }

  async GetElement(selector) {
    var element = document.querySelector(selector);
    if (element) {
      return Promise.resolve(element);
    } else {
      return new Promise((resolve) => {
        window.setTimeout(() => resolve(this.GetElement(selector)), 500);
      });
    }
  }

  async AddElement() {
    const parentElement = await this.GetElement(".modal-box-12");
    const ele = GM_addElement(parentElement, "div", {
      class: "box-right-one",
      id: "elemtoprimo",
    });
    ele.innerHTML =
      '<table style="width: 100%;"><tbody><tr><td><span id="invtemperature" name="gridpower" class="cap-size">0 ºC</span></td></tr><tr><td> Temperatura </td></tr></tbody></table>';

    this.privateField = await this.GetElement("#invtemperature");
  }

  GetTemperatureElement() {
    return this.privateField;
  }
}

class InverterData {
  constructor(domUpdateService) {
    this.domUpdateService = domUpdateService;
  }

  async GetToken() {
    const token = sessionStorage.getItem(currentTokenStorgeName, null);
    if (token) {
      return token;
    } else {
      return new Promise((resolve) => {
        window.setTimeout(() => resolve(this.GetToken()), 500);
      });
    }
  }

  async GetInverterSerial() {
    const token = sessionStorage.getItem(inverterSerialStorgeName, null);
    if (token) {
      return Promise.resolve(token);
    } else {
      return new Promise((resolve) => {
        window.setTimeout(() => resolve(this.GetInverterSerial()), 500);
      });
    }
  }

  async GetWifiSerial() {
    const token = sessionStorage.getItem(wifiSerialStorageName, null);
    if (token) {
      return Promise.resolve(token);
    } else {
      return new Promise((resolve) => {
        window.setTimeout(() => resolve(this.GetWifiSerial()), 500);
      });
    }
  }

  async GetLoginData() {
    const token = await this.GetToken();
    const inverterSerial = await this.GetInverterSerial();
    const wifiSerial = await this.GetWifiSerial();

    return { token, inverterSerial, wifiSerial };
  }

  async AutoUpdate(loginData) {
    const temperatureElement = this.domUpdateService.GetTemperatureElement();

    if (loginData != null) {
      const { status, response } = await this.GetDataFromServer(loginData);

      if (status == 200) {
        temperatureElement.innerText = response.temperature + " ºC";
      }
    }
    console.log(
      "%c [SolaxTemperature] %c Actualizado " + new Date().toISOString(),
      "background: #fb870f; color: white",
      "background: white; color: black"
    );

    setTimeout(() => {
      this.AutoUpdate(loginData);
    }, intervalTimeChecker);
  }

  GetDataFromServer({ token, inverterSerial, wifiSerial }) {
    const payload = new Date()
      .toISOString()
      .replace("T", " ")
      .split(".")
      .shift();
    const data = `inverterSN=${inverterSerial}&wifiSN=${wifiSerial}&currentTime=${encodeURIComponent(
      payload
    )}`;
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        url: urlInverter,
        method: "post",
        headers: {
          token,
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        data: data,

        onload: (arg) => this.Loaded(arg, resolve),
      });
    });
  }

  Loaded({ status, response }, resolve) {
    if (status == 200) {
      response = JSON.parse(response);
      resolve({ status, response });
    }
  }
}

(async () => {
  "use strict";

  const domUpdateService = new DomUpdateService();
  const inverterData = new InverterData(domUpdateService);

  domUpdateService.SetStyle();
  await domUpdateService.AddElement();

  const loginData = await inverterData.GetLoginData();

  await inverterData.AutoUpdate(loginData);
})();
