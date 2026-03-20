import pLimit from "p-limit";

export const axiosLimitter = pLimit(3);
