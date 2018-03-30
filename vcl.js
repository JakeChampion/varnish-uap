"use strict";

const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

// Get document, or throw exception on error
const uap = yaml.safeLoad(
  fs.readFileSync(path.join(__dirname, "/uap-core/regexes.yaml"), "utf8")
).user_agent_parsers;
const start = `sub useragent_parser {
	if (req.http.User-Agent) {
		declare local var.uaString STRING;
		set var.uaString = req.http.User-Agent;

		declare local var.uaStringFamily STRING;
		declare local var.uaStringMajor STRING;
		declare local var.uaStringMinor STRING;
		declare local var.uaStringPatch STRING;
`;
const end = `
		set req.http.useragent_parser_family = var.uaStringFamily;
		set req.http.useragent_parser_major = var.uaStringMajor;
		set req.http.useragent_parser_minor = var.uaStringMinor;
		set req.http.useragent_parser_patch = var.uaStringPatch;
	}
}`;
let file = "";
let first = true;
for (const agent of uap) {
  let s = "";
  if (first) {
    s += `		if (var.uaString ~ "${agent.regex}") {
`;
    first = false;
  } else {
    s += ` elsif (var.uaString ~ "${agent.regex}") {
`;
  }

  if (agent.family_replacement) {
    s += `			set var.uaStringFamily = "${agent.family_replacement}";
`;
  } else {
    s += `			set var.uaStringFamily = if (re.group.1, re.group.1, "0");
`;
  }
  if (agent.v1_replacement) {
    s += `			set var.uaStringMajor = "${agent.v1_replacement}";
`;
  } else {
    s += `			set var.uaStringMajor = if (re.group.2, re.group.2, "0");
`;
  }

  if (agent.v2_replacement) {
    s += `			set var.uaStringMinor = "${agent.v2_replacement}";
`;
  } else {
    s += `			set var.uaStringMinor = if (re.group.3, re.group.3, "0");
`;
  }
  s += `			set var.uaStringPatch = if (re.group.4, re.group.4, "0");
`;
  s += "		}";
  file += s;
}
fs.writeFileSync(
  path.join(__dirname, "ua_parser.vcl"),
  start + file + end,
  "utf8"
);