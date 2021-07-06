if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}

const express = require('express')
const app = express()
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const expressLayouts = require('express-ejs-layouts')
const methodOverride = require('method-override')
const session = require('express-session')
const httpObj = require('http')
//const formidable = require('express-formidable')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')
const users = require('./model/user')


const http = httpObj.createServer(app)


//DATABASE
mongoose.connect(process.env.DATABASE_URL,{useNewUrlParser:true,useUnifiedTopology:true})
const db = mongoose.connection
db.on('error',error=>console.error(error))
db.once('open',()=>console.log("database connected"))


//middelwares
app.set("view engine","ejs")
app.set("views",__dirname+"/views")
app.set("layout","layouts/layout")
app.use('/public/css',express.static(__dirname+"/public/css"))
app.use('/public/js',express.static(__dirname+"/public/js"))
//app.use('/public/js',expre.static(__dirname+"/public/js"))
app.use(express.static('./public'))
app.use(expressLayouts)
app.use(bodyParser.urlencoded())
app.use(methodOverride('_method'))
//app.use(formidable())

//Setup nodemailer

const nodemailerFrom = "loggskey1@gmail.com"
const nodemailerObject = {
    service:"gmail",
    host:"smtp.gmail.com",
    port:465,
    secure:true,
    auth:{
        user:"loggskey1@gmail.com",
        pass:"GmAiLfOrFaIz"
    }
}

//SESSIONS
app.use(session({
    secret:"secret key",
    resave:false,
    saveUninitialized:false,
    cookie:{secure:true}
}))
var mainURL = "http://localhost:3000"

app.use(function(request,result,next){
    request.mainURL = mainURL
    request.isLogin = (typeof request.session.user !== "undefined")
    request.user = request.session.user

    next()
})

http.listen(3000,function(){
    console.log("Server Started at "+mainURL)

    //home page
    app.get('/',(req,res)=>{
        res.render('index',{
            'request':req
        })
    })

    //register page
    app.get('/Register',(req,res)=>{
        res.render("Register",{
            "request":req
        })
    })

    //Register POST  
    app.post("/Register", async (req,res)=>{

        
        const name = req.body.name
        const email = req.body.email
        const password = req.body.password
        const reset_token = " "
        const isVerified = false
        const verification_token = new Date().getTime()
        

        var already_user = await users.findOne({"email":email})
        console.log(already_user)
        if(already_user == null){
            bcrypt.hash(password,10,async (err,hash)=>{
                await users.create({
                    "name":name,
                    "email":email,
                    "password":hash,
                    "reset_token":reset_token,
                    "uploaded": [],
                    "sharedWithMe":[],
                    "isVerified":isVerified,
                    "verification_token":verification_token

                }, async (err,data)=>{
                    var transporter = nodemailer.createTransport(nodemailerObject);

                    var text = "Please verify your account by clicking the following link "+ mainURL + "/verifyEmail/" +email+"/"+verification_token;


                    var html = "Please verify your account by clicking the following link :<br><br><a href= '+ mainURL +email+"/"+verification_token'>Confirm Email</a> ";

                    await transporter.sendMail({
                        from:nodemailerFrom,
                        to:email,
                        subject:"Email Verification",
                        text:text,
                        html:html
                    }, function(err,info){
                        if(err){
                            console.log(err)
                        }else{
                            console.log('Email Sent: '+info.response)
                        }
                    })
                    req.status = "success";
                    req.message ="Signned up successfully";
                    res.render('Register',{
                        "request":req
                    })
                })
            })
        }else{
            req.status = "error";
            req.message = "Email already exist"

            res.render("Register",{
                "request":req
            })
        }
            
    })



    //Verfiying link
    app.get('/verifyEmail/:email/:verification_token', async (req,res)=>{
        
        const email = req.params.email
        const verification_token = req.params.verification_token

        const user = await users.findOne({
            $and :[{
                "email":email,
            },{
                "verification_token":parseInt(verification_token)
            }]
        });

        if(user ==null){
            req.status = "error";
            req.message = "Email does not exist or verification link is expired"
            res.render("Login",{"request":req})
        }else{
            await users.findOneAndUpdate({
                $and:[{
                    "email":email,
                },{
                    "verification_token":parseInt(verification_token)
                }]
            },{
                $set:{
                    "verification_token":"",
                    "isVerified":true
                }
            })
            
            req.status = "success";
            req.message = "Accound has been verified. Please login";
            res.render("Login",{
                "request":req
            })
        }
    })


    //Render Login page
    app.get('/Login',(req,res)=>{
        res.render("Login",{
            "request":req
        })
    })

    //Login user
    app.post('/Login',async (req,res)=>{
        const email = req.body.email
        const password = req.body.password

        const user = await users.findOne({"email":email})

        if(user == null){
            req.status = "error";
            req.message = "Email does not exist";
            res.render('Login',{
                "request":req
            });
            return false
        }
        bcrypt.compare(password,user.password,(err,isVerify)=>{
            if(isVerify){
                if(user.isVerified){
                    req.session.user = user
                    res.redirect('/')
                    return false
                }

                req.status = "error"
                req.message = "Password is not correct"
                res.render('Login',{
                    "request":req
                })
            }
        })
    })

    //Forgot Password
    app.get('/ForgotPassword',(req,res)=>{
        res.render("ForgotPassword",{
            "request":req
        })
    })

    //Send recovery link
    app.post('/SendRecoveryLink',async (req,res)=>{
        const email = req.body.email

        const user= await users.findOne({"email":email})
        
        if(user==null){
            req.status = "error"
            req.message = "Email does not exist"

            res.render("ForgotPassowrd",{
                "request":req
            })
            return false
        }

        const reset_token = new Date().getTime()

        await users.findOneAndUpdate({
            "email":email
        },{
            $set:{
                "reset_token":reset_token
            }
        })

        const transporter = nodemailer.createTransport(nodemailerObject)
        const text = "Please click the following link to reset your password: "+mainURL+"/ResetPassword/"+email+"/"+reset_token;
        

        transporter.sendMail({
            from:nodemailerFrom,
            to:email,
            subject : "Reset Password",
            text:text,
        
        },function(err,info){
            if(err){
                console.error(err)
            }else{
                console.log("Email Sennt: "+info.response)
            }
            req.status = "success";
            req.message = "Email has been sent with the link to recover the passowrd";

            res.render("ForgotPassword",{
                "request":req
            })
        })

    })

    app.get("/ResetPassword/:email/:reset_token",async (req,res)=>{
        const email = req.params.email
        const reset_token = req.params.reset_token

        const user = await users.findOne({
            $and:[{
                "email":email
            },{
                "reset_token":parseInt(reset_token)
            }]
        })

        if(user ==null){
            req.status = "error";
            req.message = "Link is expired"
            res.render("Error",{
                "request":req
            })
            return false
        }

        res.render("ResetPassword",{
            "request":req,
            "email":email,
            "reset_token":reset_token
        })
    })

    app.post('/ResetPassword',async (req,res)=>{
        const email = req.body.email
        const reset_token = req.body.reset_token
        const new_password = req.body.new_password
        const confirm_password = req.body.confirm_password

        if(new_password != confirm_password){
            req.status = "error"
            req.message = "Password does not match"

            res.render("ResetPassword",{
                "request":req,
                "email":email,
                "reset_token":reset_token
            })

            return false  
        }
        
        const user = await users.findOne({
            $and:[{
                "email":email
            },{
                "reset_token":parseInt(reset_token)
            }]
        })

        if(user == null){
            req.status = "error";
            req.message = "Email does not exit or recovery link is expired"
            
            res.render('ResetPassword',{
                "request":req,
                "email":email,
                "reset_token":reset_token
            })

            return false
        }

        bcrypt.hash(new_password,10,async function (err,hash){
            await users.findOneAndUpdate({
                $and:[{
                    "email":email,
                },{
                    "reset_token":parseInt(reset_token)
                }] 
            },{
                $set:{
                    "reset_token":"",
                    "password":hash
                }
            })
            req.status = "Success";
            req.message = "Password has been changed. Please try login again";

            res.render("Login",{
                "request":req
            })
        })
    })
    
})
