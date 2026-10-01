export type Service = {
  slug: string;
  name: string;
  image: string;
  detailImage?: string;
  description: string;
  included: string[];
  notIncluded: string[];
};

export const allServices: Service[] = [
  {
    slug: "hourly-bookings",
    name: "Hourly bookings",
    image: "/services/hourly-bookings.jpg",
    description: "Book a trained helper by the hour for general home help. You decide the tasks and they get them done.",
    included: ["Any mix of routine chores you assign", "Sweeping, mopping and dusting", "Dishes and kitchen tidy-up", "Folding laundry and making beds", "Light organizing of rooms"],
    notIncluded: ["Heavy lifting or moving furniture", "Deep cleaning with specialist chemicals", "Cooking full meals", "Work at height or on ladders"],
  },
  {
    slug: "bathroom-cleaning",
    name: "Bathroom cleaning",
    image: "/services/bathroom-cleaning.jpg",
    description: "A thorough surface clean of your bathroom, from toilet to floor, so it feels fresh again.",
    included: ["Toilet bowl, seat and rim", "Washbasin and taps", "Wiping tiles and visible surfaces", "Fixtures and fittings", "Sweeping and mopping the floor", "Final wipe-down and freshening"],
    notIncluded: ["Heavy mold or hard water stains", "Acid-based descaling chemicals", "Mirrors and storage interiors", "Shower curtains and drains", "Moving heavy items"],
  },
  {
    slug: "fridge-cleaning",
    name: "Fridge cleaning",
    image: "/services/fridge-cleaning.jpg",
    description: "Empty, wipe and refresh your fridge inside and out.",
    included: ["Taking items out and putting them back", "Wiping shelves, trays and drawers", "Cleaning door seals and handles", "Wiping the outside surface", "Removing spills and light stains"],
    notIncluded: ["Defrosting a frozen freezer", "Bulk disposal of spoiled food", "Cleaning behind or under the fridge", "Repairs or part removal"],
  },
  {
    slug: "packing-or-unpacking",
    name: "Packing or unpacking",
    image: "/services/packing-unpacking.jpg",
    description: "Help boxing up or unboxing your things, neatly and carefully.",
    included: ["Sorting items into boxes", "Wrapping everyday items", "Labeling boxes by room", "Unpacking and placing items", "Folding clothes and linen"],
    notIncluded: ["Packing fragile antiques or electronics", "Dismantling furniture", "Lifting heavy boxes or transport", "Supplying packing material"],
  },
  {
    slug: "utensils",
    name: "Utensils",
    image: "/services/utensils.jpg",
    description: "Washing and arranging your dishes, pots and pans.",
    included: ["Washing plates, glasses and cutlery", "Scrubbing pots and pans", "Wiping the sink and counter", "Drying and arranging utensils"],
    notIncluded: ["Burnt or heavily stained cookware", "Loading or repairing a dishwasher", "Cleaning behind appliances", "Washing large party stock"],
  },
  {
    slug: "kitchen-prep",
    name: "Kitchen prep",
    image: "/services/kitchen-prep.jpg",
    description: "Get ingredients ready so cooking is quick: washing, cutting and organizing.",
    included: ["Washing and peeling vegetables", "Chopping and slicing", "Grinding or mixing as asked", "Setting up counters and tools", "Tidy-up after prep"],
    notIncluded: ["Cooking full meals", "Specialty recipes or cuisines", "Buying groceries", "Deep cleaning appliances"],
  },
  {
    slug: "dusting-and-wiping",
    name: "Dusting and wiping",
    image: "/services/dusting-and-wiping.jpg",
    description: "Dust and wipe the visible surfaces around your home.",
    included: ["Furniture, shelves and tables", "Decor and photo frames", "Switchboards and door handles", "Window sills and ledges", "Light wipe of electronics"],
    notIncluded: ["Ceilings and high corners", "Inside cupboards and drawers", "Fragile or antique items", "Wall or paint cleaning"],
  },
  {
    slug: "sweeping-and-mopping",
    name: "Sweeping and mopping",
    image: "/services/sweeping-and-mopping.jpg",
    description: "Floors swept and mopped, room by room.",
    included: ["Sweeping all living areas", "Mopping with floor cleaner", "Corners and under light furniture", "Door mats shaken out", "Kitchen and bathroom floors"],
    notIncluded: ["Moving heavy furniture", "Scrubbing stubborn stains", "Polishing or waxing floors", "Washing carpets or rugs"],
  },
  {
    slug: "pre-party-express-clean",
    name: "Pre-party express clean",
    image: "/services/pre-party-clean.jpg",
    description: "A quick reset before your guests arrive.",
    included: ["Living and dining area tidy-up", "Dusting and surface wipes", "Floor sweep and mop", "Bathroom refresh", "Kitchen counters and sink"],
    notIncluded: ["Decorating or setup", "Deep cleaning", "Cooking or serving", "Arranging party items"],
  },
  {
    slug: "complete-wardrobe-cleaning",
    name: "Complete wardrobe cleaning",
    image: "/services/wardrobe-cleaning.jpg",
    description: "Empty, clean and neatly refold your wardrobe.",
    included: ["Taking out and sorting clothes", "Wiping shelves and inside surfaces", "Dusting the top and sides", "Refolding and arranging", "Putting everything back"],
    notIncluded: ["Washing or dry cleaning clothes", "Discarding items without your say", "Moving the wardrobe", "Pest control treatment"],
  },
  {
    slug: "after-party-express-clean",
    name: "After-party express clean",
    image: "/services/after-party-clean.jpg",
    description: "Clear up the aftermath so your home feels normal again.",
    included: ["Collecting trash and leftovers", "Clearing and washing dishes", "Wiping tables and counters", "Floor sweep and mop", "Bathroom quick clean"],
    notIncluded: ["Heavy stain removal on fabric", "Taking down large decorations", "Clearing broken glass or hazards", "Hauling trash out of the building"],
  },
  {
    slug: "ironing-and-folding",
    name: "Ironing and folding",
    image: "/services/ironing-and-folding.jpg",
    description: "Clothes pressed and folded, ready for the wardrobe.",
    included: ["Ironing everyday clothes", "Folding neatly by type", "Sorting by person or room", "Putting clothes away"],
    notIncluded: ["Washing or drying clothes", "Delicate or embellished garments", "Saree pleating or starching", "Dry cleaning"],
  },
  {
    slug: "window-cleaning",
    name: "Window cleaning",
    image: "/services/window-cleaning.jpg",
    description: "Clean glass and frames, inside and within easy reach.",
    included: ["Glass panes wiped", "Window frames and sills", "Tracks brushed clear", "Grill or net lightly dusted"],
    notIncluded: ["Outside glass needing a ladder or ledge", "High-rise exterior cleaning", "Paint or sticker removal", "Hard water marks"],
  },
  {
    slug: "kitchen-cleaning",
    name: "Kitchen cleaning",
    image: "/services/kitchen-cleaning.jpg",
    description: "A full surface clean of your kitchen.",
    included: ["Countertops and sink", "Stovetop and appliance exteriors", "Wiping tiles near the stove", "Cabinet doors outside", "Sweeping and mopping the floor", "Trash bin wipe"],
    notIncluded: ["Chimney or exhaust deep cleaning", "Heavy grease removal", "Inside of cabinets", "Moving appliances"],
  },
  {
    slug: "balcony-cleaning",
    name: "Balcony cleaning",
    image: "/services/window-cleaning.jpg",
    description: "Balcony floors, railings and furniture refreshed.",
    included: ["Sweeping and mopping the floor", "Wiping railings and ledges", "Dusting outdoor furniture", "Cleaning door tracks", "Clearing dust and leaves"],
    notIncluded: ["Deep cleaning of bird droppings", "Outer side of glass or railings", "Pressure washing", "Pest control"],
  },
  {
    slug: "fan-cleaning",
    name: "Fan cleaning",
    image: "/services/dusting-and-wiping.jpg",
    description: "Ceiling and standing fans cleaned of dust.",
    included: ["Blades wiped front and back", "Motor housing dusted", "Guard and grill cleaned", "Floor wiped afterward"],
    notIncluded: ["Fan repair or oiling", "Opening up the motor", "Very high ceilings", "Cleaning AC units"],
  },
  {
    slug: "kitchen-cabinet-cleaning",
    name: "Kitchen cabinet cleaning",
    image: "/services/kitchen-cleaning.jpg",
    description: "Cabinets emptied, wiped and put back in order.",
    included: ["Taking out and putting back items", "Wiping shelves and inside surfaces", "Cleaning doors and handles", "Removing crumbs and dust"],
    notIncluded: ["Heavy grease or oil stains", "Washing the items stored inside", "Repairs or hinge adjustments", "Pest control"],
  },
  {
    slug: "plant-care",
    name: "Plant care",
    image: "/services/sweeping-and-mopping.jpg",
    description: "Light care for your indoor and balcony plants.",
    included: ["Watering as per your routine", "Wiping dusty leaves", "Removing dry leaves", "Tidying pots and saucers"],
    notIncluded: ["Repotting or changing soil", "Fertilizer or pesticide treatment", "Pruning large plants", "Plant diagnosis or buying plants"],
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return allServices.find((s) => s.slug === slug);
}
