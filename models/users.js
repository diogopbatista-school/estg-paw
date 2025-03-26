const mongoose = require("mongoose");

const UserShema = new mongoose.Schema({
    name:{
        type : String,
        required : true
    },
    nif:{
        type : Number,
        required : true,
        unique : true
    },
    email:{
        type : String,
        required : true,
        unique : true
    },
    password:{
        type : String,
        required : true
    },
    salt:{
        type : String,
        required : true
    },
    role: { 
        type: String,
        enum: ['cliente', 'restaurante', 'admin'], default: 'cliente' 
    },
    address: { // Alterado para um subdocumento
        location: { 
            type: String, 
            required: true 
        },
        zipCode: {
             type: String, 
             required: true 
        },
        street: { 
            type: String, 
            required: true      
        }
      },
    phone: {
        type: Number,
    },
    orderHistory: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
        default: undefined // Só aparece se for cliente
      },
    created_at: {
        type: Date,
        default: Date.now
      },
    });

    UserShema.methods.toJson = function(){
        const user = this.toObject();
        if ( user.role !== 'cliente'){
            delete user.orderHistory;
        }
        return user;
    };

    module.exports = mongoose.model("User", UserSchema);