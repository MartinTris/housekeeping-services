import React from "react";

const Information = ({ infoName, value }) => {
  return (
    <div className="flex flex-col justify-center h-28 w-70 bg-white/90 border border-green-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm px-5">
      <h3 className="text-green-900 font-semibold text-base tracking-wide text-left">
        {infoName}
      </h3>
      <h3 className="text-green-700 font-bold text-2xl mt-1 text-left">
        {value}
      </h3>
    </div>
  );
};

export default Information;
