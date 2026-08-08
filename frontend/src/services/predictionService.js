import axios from 'axios';

// Goes through the API gateway (8090) like every other call — 9090 was the old
// pre-microservices backend port and nothing listens there any more.
const API_URL = 'http://localhost:8090/api/predict';

// The predict endpoint is public (permitAll) and the JWT now lives in an httpOnly
// cookie, so no Authorization header is passed. withCredentials sends the cookie
// if the endpoint ever starts requiring auth.
export const getPrediction = async (symbol, prices, buyPrice) => {
  const response = await axios.post(
    `${API_URL}/${symbol}`,
    { prices, buyPrice },
    { withCredentials: true }
  );
  return response.data;
};
