import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://sendiflash.com";
const URL = `${BASE_URL}/api/config/status`;

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 10 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate==0"],
    http_req_duration: ["p(95)<500"],
  },
};

export default function configStatusScenario() {
  const response = http.get(URL);

  check(response, {
    "config status returns 200": (res) => res.status === 200,
    "config status success is true": (res) => {
      try {
        return res.json("success") === true;
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
