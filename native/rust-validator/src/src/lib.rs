
use napi::{bindgen_prelude::*, JsObject, JsString};
use napi_derive::napi;
use chrono::{Utc, NaiveDate};
use std::collections::HashSet;

#[napi(object)]
pub struct UserInfo {
    pub status: String,
    pub user: String,
    pub device: String,
    pub expires: String,
    pub ip_bound: Option<String>,
}

#[napi]
pub fn validate_user(
    key: String,
    subs_raw: String,
    block_raw: String,
    req_ip: String,
    user_agent: String,
) -> UserInfo {
    let block_set: HashSet<_> = block_raw.lines().map(|l| l.trim()).collect();

    if block_set.contains(key.as_str()) {
        return UserInfo {
            status: "BLOCKED".into(),
            user: "".into(),
            device: "".into(),
            expires: "".into(),
            ip_bound: None,
        };
    }

    let mut user_data_line = None;

    for line in subs_raw.lines() {
        if line.starts_with(&format!("{}|", key)) {
            user_data_line = Some(line);
            break;
        }
    }

    if user_data_line.is_none() {
        return UserInfo {
            status: "NONE".into(),
            user: "".into(),
            device: "".into(),
            expires: "".into(),
            ip_bound: None,
        };
    }

    let parts: Vec<&str> = user_data_line.unwrap().split('|').map(|s| s.trim()).collect();

    // Expected: key|device|expiry|user|ipbound (optional)
    if parts.len() < 4 {
        return UserInfo {
            status: "NONE".into(),
            user: "".into(),
            device: "".into(),
            expires: "".into(),
            ip_bound: None,
        };
    }

    let expiry_raw = parts[2];
    let expiry_stripped = expiry_raw.replace("-", "");

    let expiry_date = NaiveDate::parse_from_str(&expiry_stripped, "%d%m%Y").unwrap_or_else(|_| Utc::now().naive_utc().date());

    let now = Utc::now().naive_utc().date();

    if now > expiry_date {
        return UserInfo {
            status: "EXPIRED".into(),
            user: parts[3].to_string(),
            device: parts[1].to_string(),
            expires: expiry_raw.to_string(),
            ip_bound: None,
        };
    }

    // Device binding and IP binding check (optional)

    let ip_bound = if parts.len() >= 5 { Some(parts[4].to_string()) } else { None };

    if let Some(ipb) = &ip_bound {
        if !ipb.is_empty() && ipb != &req_ip {
            return UserInfo {
                status: "BLOCKED".into(),
                user: parts[3].to_string(),
                device: parts[1].to_string(),
                expires: expiry_raw.to_string(),
                ip_bound: Some(ipb.clone()),
            };
        }
    }

    UserInfo {
        status: "ACTIVE".into(),
        user: parts[3].to_string(),
        device: parts[1].to_string(),
        expires: expiry_raw.to_string(),
        ip_bound,
    }
      }
