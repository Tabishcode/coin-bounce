class UserDTO{    //data transfer object
    constructor(user) {
         this._id = user._id;
         this.userName = user.userName;
         this.name = user.name; 
         this.email = user.email;    
    }
}
module.exports = UserDTO;