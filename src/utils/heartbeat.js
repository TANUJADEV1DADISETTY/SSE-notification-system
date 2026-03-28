function startHeartbeat(res) {
  return setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);
}

module.exports = startHeartbeat;