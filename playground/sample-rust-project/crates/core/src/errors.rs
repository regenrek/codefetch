// Core error types
use std::fmt;

#[derive(Debug)]
pub enum CoreError {
    NotFound(String),
    InvalidInput(String),
}

impl fmt::Display for CoreError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            CoreError::NotFound(msg) => write!(f, "Not found: {}", msg),
            CoreError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
        }
    }
}
