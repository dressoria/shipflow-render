import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://sendiflash.com";

const PATHS = [
  "/",
  "/shipping-labels",
  "/fba-prep",
  "/ecuador",
  "/login",
  "/registro",
  "/support",
  "/terms",
  "/privacy",
];

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 10 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate==0"],
    http_req_duration: ["p(95)<1500"],
  },
};

export default function publicPagesScenario() {
  for (const path of PATHS) {
    const response = http.get(`${BASE_URL}${path}`);

    check(response, {
      [`${path} returns 200`]: (res) => res.status === 200,
    });

    sleep(1);
  }
}
