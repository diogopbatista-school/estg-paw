const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    customer:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    restaurant:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    items:[
        {
            dish:{
                type: mongoose.Schema.Types.ObjectId,
                required: true
            },
            quantity:{
                type: Number,
                required: true,
                min:1
            }
        }
    ],
    totalPrice:{
        type: Number,
        required: true
    },
    status:{
        type: String,
        enum: ['pending', 'preparing', 'delivering', 'delivered', 'canceled'], 
        default: 'pending'
    },
    paymentMethod : {
        type: String,
        enum: ['cash', 'card'],
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
      },
});

OrderSchema.pre('save', async (next) => {
    if ( this.isModified('status') && this.status === 'delivered'){
        try{
            await User.findByIdAndUpdate(this.customer, {
                 $push: { orderHistory: this._id } 
            });
            next();
        } catch(error){
            next(error);
        }
    }else{
        next(); // caso o status não seja alterado ou não seja 'delivered' , continua 
    }
});

module.exports = mongoose.model('Order', OrderSchema);
