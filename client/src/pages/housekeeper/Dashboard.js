import { useState, useEffect } from 'react'

const HousekeeperDashboard = ({setAuth}) => {

  const [name, setName] = useState("");

  async function getName(){
    try {
      const response = await fetch("http://localhost:5000/dashboard/", {

        method: "GET",
        headers: {token: localStorage.token},
      });

      const parseRes = await response.json();

      setName(parseRes.name);
    } catch (err) {
      console.error(err.message);
    }
  }

  const logout = (e) => {
    e.preventDefault();
    localStorage.removeItem("token");
    setAuth(false);
  }

  useEffect(() => {
    getName();
  }, [])
  return (
    <div>
      <h2>Housekeeper Dashboard</h2>
      <h3>Welcome {name}</h3>
      <button onClick={(e) => logout(e)}>Logout</button>
    </div>
  );
}

export default HousekeeperDashboard;