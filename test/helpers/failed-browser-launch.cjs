// Only the external launch boundary fails; the verifier acquires a real server.
module.exports={chromium:{async launch(){throw Error('QA browser executable launch failure');}}};
