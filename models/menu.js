const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema({
    restaurant:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    category:{
        type: String,
        required: true
    },
    dishes:[
        {
            name:{
                type: String,
                required: true
            },
            description:{
                type: String,
                required: true
            },
            image:{
                type: String, // url da imagem
            },
            nutritionFacts:{
                type: String
            },
            prices:{
                small : {
                    type: Number,
                    required: false
                },
                medium : {
                    type: Number,
                    required: true
                },
                large : {
                    type: Number,
                    required: false
                },
            },
        }
    ],
    created_at: {
        type: Date,
        default: Date.now
      },
});

MenuSchema.pre('save', (next) => {
    if (this.dishes.length > 10){
        next(new Error('Menu can only have 10 dishes'));
    }
    next();
});

module.exports = mongoose.model('Menu', MenuSchema);