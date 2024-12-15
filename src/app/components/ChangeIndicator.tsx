"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Address, formatUnits } from "viem";

function ChangeIndicator({
  change,
  threshold = 10_000,
  isNew = true,
  location = "right",
}: {
  change: bigint;
  threshold?: number;
  isNew?: boolean;
  location?: "left" | "right";
}) {
  const actualValue = BigInt(change);
  const numberValue = Number(formatUnits(actualValue, 18));
  const absValue = Math.abs(numberValue);
  const tooltipClasses =
    location === "left"
      ? "absolute right-full mr-2 transform"
      : "absolute left-full ml-2 transform";

  return (
    <span className="relative group hover:cursor-pointer inline-flex items-center">
      {absValue > threshold ? (
        numberValue < 0 ? (
          <span
            className={` pt-1 ${isNew ? " text-ens-blue" : "text-green-500"}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 01.707.293l5 5a1 1 0 11-1.414 1.414L11 6.414V16a1 1 0 11-2 0V6.414L5.707 9.707a1 1 0 01-1.414-1.414l5-5A1 1 0 0110 3z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        ) : (
          <span className="text-red-500 pt-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 17a1 1 0 01-.707-.293l-5-5a1 1 0 111.414-1.414L9 13.586V4a1 1 0 112 0v9.586l3.293-3.293a1 1 0 111.414 1.414l-5 5A1 1 0 0110 17z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )
      ) : (
        <span className="text-gray-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M4 10h12a1 1 0 010 2H4a1 1 0 110-2z" />
          </svg>
        </span>
      )}

      {/* Tooltip */}
      <span
        className={`${tooltipClasses} bg-black text-white text-sm rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity`}
      >
        {absValue > threshold
          ? formatChange(numberValue)
          : formatChange(numberValue, true)}
        {isNew && " (New)"}
      </span>
    </span>
  );
}

function formatChange(value: number, showSign: boolean = false): string {
  const isNegative = value < 0;
  const absoluteValue = Math.abs(value);
  let formattedValue: string;

  if (absoluteValue < 1000) {
    formattedValue = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(absoluteValue);
  } else if (absoluteValue < 1000000) {
    const thousands = absoluteValue / 1000;
    formattedValue = `${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(thousands)}k`;
  } else {
    const millions = absoluteValue / 1000000;
    formattedValue = `${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(millions)}m`;
  }

  if (showSign) {
    return `${isNegative ? "+" : "-"}${formattedValue}`;
  }
  return formattedValue;
}

export default ChangeIndicator;
