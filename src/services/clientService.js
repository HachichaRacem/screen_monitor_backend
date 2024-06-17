class Client {
  socket;
  id;
  constructor(socket, id) {
    this.socket = socket;
    this.id = id;
  }
}
export default Client;
