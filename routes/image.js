var express = require('express');
var router = express.Router();
var path = require('path');
var isSecure = require('./common').isSecure;
var isAuthenticated = require('./common').isAuthenticated;
var formidable = require('formidable');
var fs = require('fs');
var Image = require('../models/image');

//카페 이미지 업로드&수정
router.put('/', isSecure, isAuthenticated, function(req, res, next) {
    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, '../images/cafes');
    form.keepExtensions = true;
    form.multiples = false;
    form.parse(req, function(err, fields, files) {
        if (err) {
            return next(err);
        }
        if (files && Object.keys(files).toString().match(/photo\d+/i)) {

            // 'photo + 숫자' 형식으로 들어온 문자열에서 숫자를 추출
            var sequence = parseInt(Object.keys(files).toString().substring(5, 6));

            // 'photo + 숫자' 형식으로 들어온 파일을 저장
            var imageFile = files["photo" + sequence];

            // 파일의 path를 저장
            var srcImagePath = imageFile.path;

            // 이미지파일의 이름 변경
            var newFileName = req.user.id + '_' + sequence + path.extname(srcImagePath);

            // 원래 파일의 path에 바꾸고싶은 이름으로 변경하여 저장하기 위한 path
            var destImagePath = path.join(path.dirname(srcImagePath), newFileName);

            // 이 곳의 destImagePath는 DB상에 저장될 경로
            Image.insertOrEditImages(req.user.id, destImagePath, sequence, function (err, result) { 
                if (err) {
                    return next(err);
                }
                // 이 곳의 destImagePath는 실제 저장될 경로
                fs.rename(srcImagePath, destImagePath, function(err) {
                    if (err) {
                        return next(err);
                    }
                    res.send({
                        message: '이미지 업로드 완료!',
                    });
                });
            });
        } else {
            return next(new Error('파일의 키 값은 \'photo + 숫자\' 형식으로 올려주세요'));
        }
    });
});

module.exports = router;