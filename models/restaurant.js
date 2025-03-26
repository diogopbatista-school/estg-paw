const { name } = require('ejs');
const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema({
    owner:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    name:{
        type: String,
        required: true
    },
    description : {
        type: String,
    },
    address: { 
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
        required: true
    },
    menus: 
    [
        { 
            type: mongoose.Schema.Types.ObjectId, ref: "menu" 
        }
    ],
    verified : {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
      },
});

RestaurantSchema.pre("save", async function(next) {
    try {
      // Tenta encontrar o usuário (owner)
      const user = await mongoose.model("users").findById(this.owner); // "User" deve ser maiúsculo, pois é o nome do modelo
  
      // Se o usuário não for encontrado, lance um erro
      if (!user) {
        const error = new Error("Owner user not found.");
        error.status = 404; // Erro de não encontrado (404)
        return next(error); // Passa o erro para o próximo middleware de erro
      }
  
      // Se o usuário for encontrado, copie o endereço
      this.address = user.address;
  
      // Se tudo estiver correto, chama o next()
      next();
  
    } catch (error) {
      // Se algum erro ocorrer no bloco try, ele será capturado aqui
      error.status = 500; // Erro interno do servidor
      return next(error); // Passa o erro para o próximo middleware de erro
    }
  });
  