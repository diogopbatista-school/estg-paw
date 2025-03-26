const order = require('../models/orderModel');
const user = require('../models/userModel');

exports.updateOrderStatus = async (req, res) => {
    try{
        const { orderId } = req.params;
        const { status } = req.body;

        const order = await order.findById(orderId);
        if(!order){
            return res.status(404).json({ error: 'Order not found' });
        }

        order.status = status;
        await order.save();

        if (status === 'delivered'){
            await user.findByIdAndUpdate(order.customer, {
                $push: { orderHistory: order._id }
            });
        }

        res.status(200).json({ message: "Order updated successfully" , order });
    
    } catch(error){
        res.status(500).json({ message: "Error updating status's order " , error});
    }
};
