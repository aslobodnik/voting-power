function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const paginationRange = () => {
    if (totalPages <= 6) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      if (currentPage <= 3) {
        return currentPage === 3
          ? [1, 2, 3, 4, "...", totalPages]
          : [1, 2, 3, "...", totalPages - 1, totalPages];
      } else if (currentPage > totalPages - 3) {
        return currentPage === totalPages - 2
          ? [
              1,
              "...",
              totalPages - 3,
              totalPages - 2,
              totalPages - 1,
              totalPages,
            ]
          : [1, 2, "...", totalPages - 2, totalPages - 1, totalPages];
      } else {
        return [
          1,
          2,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages,
        ];
      }
    }
  };

  return (
    <div className="flex space-x-2">
      {totalPages === 0 && <button className="h-10 w-10"></button>}
      {paginationRange().map((item, index) => (
        <button
          key={index}
          className={`h-10 w-10 border hover:bg-zinc-600 transition-colors duration-300 ease-in-out border-zinc-700 rounded ${
            currentPage === item ? "bg-zinc-700" : ""
          }`}
          onClick={() => typeof item === "number" && onPageChange(item)}
          disabled={typeof item !== "number"}
        >
          {typeof item === "number" ? item : "..."}
        </button>
      ))}
    </div>
  );
}

export default Pagination;
