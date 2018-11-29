//installed packages
const express = require("express");
const app = express();
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;

//database server 
const URL = "mongodb://localhost:27017/";
 var EMPLOYEE,HARMONY_ID;
 var bodyParser = require('body-parser');
 app.use(bodyParser.json()); // support json encoded bodies
 app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
 app.use(cors());


app.listen(3000, () => {
 console.log("Server running on port 3000");
});

   //validate a user when he/ she provides his user id localhost:3000/validateUser?tagId=3
app.get("/validateUser", function(req, res) {
var harmonyId= parseInt( req.query.harmonyId);
MongoClient.connect(URL, function(err, db) {
    var dbo = db.db("USER_DB_FOR_MAKEATHON_3");
    console.log("Conecting...");
    if (err) throw err;
    dbo.collection("employees").findOne({"harmony_id": harmonyId}, function(err, result) {
        if (err) throw err;
        if(result!=null){
            var cntxt = createContext(result);
            HARMONY_ID = harmonyId;
            EMPLOYEE = result;
            console.log('1 record found, user exists',EMPLOYEE);
            res.send({
                "status_code": 200,
                "employee_detail": result,
                "context": cntxt
            });
        }
        else{
            res.send({
                "status_code": 404,
                "status_message" : "Wrong input or invalid user"
            });
        }
        db.close();
        });
}
);  
});

//Get the latest leave detail by passing emp_id http://localhost:3000//lastLeaveDetail?id=772377
app.get("/leaveDetail",function(req, res){
    console.log("Called",req.query.id);
    var employeeId= parseInt( req.query.id);
    MongoClient.connect(URL, function(err, db) {
        var dbo = db.db("USER_DB_FOR_MAKEATHON_3");
        if (err) throw err;
        dbo.collection("leave_transactions").find({"emp_id":employeeId}).sort({request_date: -1}).toArray(function(err,result){
            if (err) throw err;
            if(result!=null || result.length>0){
                var lvContext = leaveContext(result[0])
                //console.log('Latest record found:',result);
                res.send({
                    "status_code": 200,
                    "leaveDetails": result,
                    "context": lvContext
                });
            }
            else{
                res.send({
                    "status_code": 404,
                    "status_message" : "Looks like you haven't applied for any leaves yet."
                });
            }
            db.close();
          });
    }
    );    
});

//Incoming post request to apply for a leave date-format: "2019-01-22"
app.post('/applyLeave', function(req, resp) {
    var empId = req.body.emp_id;
    var numberOfDays = req.body.duration;
    var startDate = new Date(req.body.start_date);
    var endDate = new Date(req.body.end_date);
    MongoClient.connect(URL, function(err, db) {
        var dbo = db.db("USER_DB_FOR_MAKEATHON_3");
        if (err) throw err;
        dbo.collection("leave_transactions").insertOne({
            "emp_id" : empId,
            "request_date" : new Date(),
            "number_of_days" : parseInt(numberOfDays),
            "start_date" : startDate,
            "end_date" : endDate,
            "summary" : "Personal work",
            "status" : "Requested"
        }, function(err, res) {
            if (err) {
                resp.send({
                    "status_code": 400,
                    "status_message": "Application failed, please try again later."
                });
                throw err;
            }
            var myquery = { "emp_id": empId };
            var new_values = { $inc: { "leave_requests": 1, "leave_balance" :(- numberOfDays) } };
            console.log('1. ----------Going for employee updation-------------');
            console.log("Query: ",myquery,new_values);
            dbo.collection("employees").updateOne(myquery, new_values, function(err, res) {
                if (err) throw err;
                console.log("2. Employee details updated");
                dbo.collection("employees").findOne({"emp_id": empId}, function(error, result) {
                    if (error) throw error;
                    console.log(result);
                    if(result!=null){
                       // var cntxt = createContext(result);
                        EMPLOYEE = result;
                        console.log('3. Record found',EMPLOYEE);
                        resp.send({
                            "status_code": 200,
                            "employee_detail": result,
                            "status_message": "Leave applied successfully"
                        });
                    }
                    else{
                        resp.send({
                            "status_code": 404,
                            "status_message" : "Wrong input or invalid user"
                        });
                    }
                    });
            db.close();
          });

    });
});
});


//Cancel leave Request
app.post('/cancelLeave', function(req, resp) {
    var requestId = req.body.req_id;
    MongoClient.connect(URL, function(err, db) {
        var dbo = db.db("USER_DB_FOR_MAKEATHON_3");
        if (err) throw err;
        var myquery = { address: "Valley 345" };
        var newvalues = { $set: {name: "Mickey", address: "Canyon 123" } };
        dbo.collection("leave_transactions").updateOne(myquery, newvalues, function(err, res) {
            if (err) {
                resp.send({
                    "status_code": 400,
                    "status_message": "Application failed, please try again later."
                });
                throw err;
            }
            var myquery = { "emp_id": empId };
            var new_values = { $inc: { "leave_requests": 1, "leave_balance" :(- numberOfDays) } };
            console.log('----------Going for employee updation-------------');
            console.log("Query: ",myquery,new_values);
            dbo.collection("employees").updateOne(myquery, new_values, function(err, res) {
                if (err) throw err;
                console.log("1 document updated");
                db.close();
            console.log("collection updated!");
            resp.send({
                "status_code": 200,
                "status_message": "Leave applied successfully"
            });
            db.close();
          });

    });
});
});
//Returning context for leave transaction data
function  leaveContext(leaveDetail){
    var date = new Date();
    var leaveDetailsString;
    console.log("Leave :",date, leaveDetail.start_date);
    if(date <= leaveDetail.start_date){
        leaveDetailsString = `Your upcoming leave is on ${leaveDetail.start_date}`; 
    }
    else{
        leaveDetailsString = `Your last leave was on ${leaveDetail.start_date}`; 
    }
    var context= `Your last leave request was submitted on ${leaveDetail.request_date}. Your last leave application was for ${leaveDetail.number_of_days} days. ${leaveDetailsString}`
    return context;

}

//Returning context for user search data
function createContext(employee){
    var context = `The employee id ${employee.emp_id} belongs to ${employee.emp_name} . You have a total of  ${employee.leave_balance} leaves left. Your total leave balance is ${employee.leave_balance}. You can avail a total of ${employee.leave_balance} leaves. You have ${employee.leave_balance} leaves remaining. Your pending leaves are ${employee.leave_balance}. You can apply for ${employee.leave_balance} leaves if required. You have submitted ${employee.leave_requests} requests for approval. You have ${employee.leave_requests} leave requests pending for approval from your manager. You have applied for ${employee.leave_requests} leaves already. Your applied leaves are ${employee.leave_requests}. Your manager is ${employee.manager_name}. `
    console.log("Context: ", context);
    return context;
}

// Add the last leave applied info to the context. 
// Update the leave balance when user applies for a leave.

// function validate_user(harmonyId){
//     MongoClient.connect(URL, function(err, db) {
//         var dbo = db.db("USER_DB_FOR_MAKEATHON_3");
//         if (err) throw err;
//         dbo.collection("employees").findOne({"harmony_id":harmonyId},{ projection: {_id:0, emp_id:1,emp_name:1}}, function(err, result) {
//             if (err) throw err;
//             if(result!=null){
//                 HARMONY_ID = harmonyId;
//                 EMPLOYEE = result;
//                 console.log('1 record found, user exists',EMPLOYEE);
//                 return result;
//             }
//             else{
//                 return false;
//             }
//             db.close();
//           });
//     }
//     );    
// }
//,{ projection: {_id:0, emp_id:1,emp_name:1}}


// function addLeaveTransaction(empId, startDate, endDate,numberOfDays){
//     MongoClient.connect(URL, function(err, db) {
//         var dbo = db.db("USER_DB_FOR_MAKEATHON_3");
//         if (err) throw err;
//         dbo.collection("leave_transaction").insertOne({
//             "emp_id" : empId,
//             "request_date" : Date(),
//             "number_of_days" : numberOfDays,
//             "start_date" : startDate,
//             "end_date" : endDate,
//             "summary" : "Personal",
//             "status" : "Requested"
//         }, function(err, res) {
//             if (err) return false;
//             console.log("collection updated!");
//             db.close();
//             return true;
//           });

//     });
// }


// function addUser(emp_id, harm_id, name, phone, email)
// {
//     MongoClient.connect(URL, function(err, db) {
//         var dbo = db.db("USER_DB_FOR_MAKEATHON_3");
//         if (err) throw err;
//         dbo.collection("employees").insertOne({
//             "emp_id":emp_id,
//             "harmony_id":harm_id,
//             "emp_name": name,
//             "phone_no":phone,
//             "mail_id":email,
//             "manager_name":"Manoj",
//             "leave_balance":10,
//             "leave_requests":0
//         }, function(err, res) {
//             if (err) throw err;
//             console.log("collection updated!");
//             db.close();
//           });

//     }
//     );  
// }