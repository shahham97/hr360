#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{command, AppHandle};

#[command]
fn get_client_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[command]
fn store_secure_token(service: String, token: String) -> Result<(), String> {
    let entry = keyring::Entry::new(&service, "hr360_active_session")
        .map_err(|e| e.to_string())?;
    entry.set_password(&token).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
fn get_secure_token(service: String) -> Result<String, String> {
    let entry = keyring::Entry::new(&service, "hr360_active_session")
        .map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

#[command]
fn clear_secure_token(service: String) -> Result<(), String> {
    let entry = keyring::Entry::new(&service, "hr360_active_session")
        .map_err(|e| e.to_string())?;
    let _ = entry.delete_password();
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_client_version,
            store_secure_token,
            get_secure_token,
            clear_secure_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running HR360 desktop client application");
}

fn main() {
    run();
}
