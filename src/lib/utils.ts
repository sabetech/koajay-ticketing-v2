import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
const IMAGE_BASE_URL = "https://ticketing.koajay.com/storage/img/profiles/";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const getImageUrl = (profilePic: string | null): string | null => {
    if (!profilePic) return null;
    return `${IMAGE_BASE_URL}/${profilePic.substring(19)}`;
};
