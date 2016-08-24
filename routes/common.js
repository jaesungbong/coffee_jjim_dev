
function isAuthenticated(req, res, next) {
  if (!req.user) {
    return res.status(401).send({
      message: 'login required'
    });
  }
  next();
}

function isSecure(req, res, next) { //https로 들어오지 않으면 돌려보내는 함수
  if (!req.secure) {
    return res.status(426).send({
      message: 'upgrade required!!'
    })
  }
  next();
}

module.exports.isAuthenticated = isAuthenticated;
module.exports.isSecure = isSecure;