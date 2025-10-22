import React from "react";

const Information = (props) => {
  return (
    <div className="flex flex-col text-center justify-center items-center h-32 w-40 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition">
      <h3 className="text-green-800 font-semibold">{props.infoName}</h3>
      <h3 className="text-green-800 font-semibold">{props.value}</h3>
    </div>
  );
};

export default Information;
