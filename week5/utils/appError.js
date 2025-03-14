// 自訂錯誤類別
function AppError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true; // 用來標記這是應用層的錯誤
    return error;
}

module.exports = AppError;
  