const multer = require('multer')
const path = require('path')


//init upload
module.exports = multer({
    storage:multer.diskStorage({}),
    limits:{fileSize:10000000},
    fileFilter: function(req,file,cb){
        checkFileType(file,cb);
    }
})


//Check File Type
function checkFileType(file,cb){
    //Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;
    //check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())

    //check mime
    const mimetype = filetypes.test(file.mimetype)

    if(mimetype && extname){
        return cb(null,true)
    }else{
        cb('Error: Images Only!')
    }
}