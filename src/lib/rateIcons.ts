export interface RateIconOption {
    name: string;
    url: string;
}

const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg";

const CODEPOINTS: { name: string; codepoint: string }[] = [
    { name: "Bus", codepoint: "1f68c" },
    { name: "Oncoming bus", codepoint: "1f69d" },
    { name: "Minibus", codepoint: "1f690" },
    { name: "Trolleybus", codepoint: "1f68d" },
    { name: "Taxi", codepoint: "1f695" },
    { name: "Car", codepoint: "1f697" },
    { name: "Oncoming car", codepoint: "1f698" },
    { name: "Truck", codepoint: "1f69a" },
    { name: "Pickup truck", codepoint: "1f6fb" },
    { name: "Lorry", codepoint: "1f69b" },
    { name: "Tractor", codepoint: "1f69c" },
    { name: "Motorcycle", codepoint: "1f3cd" },
    { name: "Motor scooter", codepoint: "1f6f5" },
    { name: "Police car", codepoint: "1f693" },
    { name: "Ambulance", codepoint: "1f691" },
    { name: "Fire engine", codepoint: "1f692" },
    { name: "Auto rickshaw", codepoint: "1f6fa" },
    { name: "Tram", codepoint: "1f68a" },
    { name: "High-speed train", codepoint: "1f684" },
    { name: "Train", codepoint: "1f686" },
    { name: "Light rail", codepoint: "1f688" },
];

export const RATE_ICON_OPTIONS: RateIconOption[] = CODEPOINTS.map(({ name, codepoint }) => ({
    name,
    url: `${TWEMOJI_BASE}/${codepoint}.svg`,
}));
