// 處理 try-catch
const handleErrorAsync = (func) => {
    return (req, res, next) => {
        func(req, res, next).catch((err) => next(err));
    };
};
  
module.exports = handleErrorAsync;