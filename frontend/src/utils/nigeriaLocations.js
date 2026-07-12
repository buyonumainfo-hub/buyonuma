/**
 * Nigeria states + cities/towns (LGAs) reference data.
 * Used to validate/populate the seller registration "location" field
 * (state + city) and to power location-based sorting/filtering on the
 * public product and seller listing endpoints.
 *
 * Kept as a plain JS object (not a DB collection) since this data is
 * static and small — no need for a network round trip to look it up.
 */
export const NIGERIA_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT (Abuja)", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

// State -> list of cities/towns/LGAs. Not exhaustive of every ward, but
// covers the major cities/LGAs buyers and sellers would realistically
// search for.
export const NIGERIA_CITIES_BY_STATE = {
  "Abia": ["Aba", "Umuahia", "Ohafia", "Arochukwu", "Isiala Ngwa"],
  "Adamawa": ["Yola", "Mubi", "Numan", "Ganye", "Jimeta"],
  "Akwa Ibom": ["Uyo", "Eket", "Ikot Ekpene", "Oron", "Abak"],
  "Anambra": ["Awka", "Onitsha", "Nnewi", "Ekwulobia", "Aguata"],
  "Bauchi": ["Bauchi", "Azare", "Misau", "Jama'are", "Ningi"],
  "Bayelsa": ["Yenagoa", "Brass", "Sagbama", "Ogbia", "Nembe"],
  "Benue": ["Makurdi", "Gboko", "Otukpo", "Katsina-Ala", "Vandeikya"],
  "Borno": ["Maiduguri", "Biu", "Bama", "Dikwa", "Konduga"],
  "Cross River": ["Calabar", "Ikom", "Ogoja", "Ugep", "Obudu"],
  "Delta": ["Warri", "Asaba", "Sapele", "Ughelli", "Agbor"],
  "Ebonyi": ["Abakaliki", "Afikpo", "Onueke", "Ezza", "Ikwo"],
  "Edo": ["Benin City", "Auchi", "Ekpoma", "Uromi", "Igarra"],
  "Ekiti": ["Ado-Ekiti", "Ikere-Ekiti", "Ilawe-Ekiti", "Oye-Ekiti", "Ikole-Ekiti"],
  "Enugu": ["Enugu", "Nsukka", "Awgu", "Agbani", "Oji River"],
  "FCT (Abuja)": ["Abuja Central", "Gwagwalada", "Kuje", "Bwari", "Kubwa", "Lugbe", "Garki", "Wuse", "Maitama", "Asokoro"],
  "Gombe": ["Gombe", "Kaltungo", "Billiri", "Dukku", "Kumo"],
  "Imo": ["Owerri", "Orlu", "Okigwe", "Mbaise", "Oguta"],
  "Jigawa": ["Dutse", "Hadejia", "Gumel", "Kazaure", "Birnin Kudu"],
  "Kaduna": ["Kaduna", "Zaria", "Kafanchan", "Sabon Gari", "Soba"],
  "Kano": ["Kano", "Wudil", "Gwarzo", "Rano", "Bichi"],
  "Katsina": ["Katsina", "Funtua", "Daura", "Malumfashi", "Kankia"]
  ,"Kebbi": ["Birnin Kebbi", "Argungu", "Yauri", "Zuru", "Jega"],
  "Kogi": ["Lokoja", "Okene", "Idah", "Kabba", "Ankpa"],
  "Kwara": ["Ilorin", "Offa", "Omu-Aran", "Lafiagi", "Jebba", "Patigi", "Kaiama", "Erin-Ile"],
  "Lagos": ["Ikeja", "Lekki", "Victoria Island", "Surulere", "Yaba", "Ikorodu", "Badagry", "Epe", "Ajah", "Apapa", "Alimosho", "Agege"],
  "Nasarawa": ["Lafia", "Keffi", "Akwanga", "Nasarawa", "Doma"],
  "Niger": ["Minna", "Bida", "Suleja", "Kontagora", "Lapai"],
  "Ogun": ["Abeokuta", "Ijebu-Ode", "Sagamu", "Ota", "Ilaro"],
  "Ondo": ["Akure", "Ondo City", "Owo", "Ikare-Akoko", "Okitipupa"],
  "Osun": ["Osogbo", "Ile-Ife", "Ilesa", "Ede", "Iwo"],
  "Oyo": ["Ibadan", "Ogbomoso", "Oyo Town", "Iseyin", "Saki"],
  "Plateau": ["Jos", "Bukuru", "Pankshin", "Shendam", "Barkin Ladi"],
  "Rivers": ["Port Harcourt", "Obio-Akpor", "Bonny", "Eleme", "Okrika"],
  "Sokoto": ["Sokoto", "Tambuwal", "Wurno", "Gwadabawa", "Illela"],
  "Taraba": ["Jalingo", "Wukari", "Bali", "Gembu", "Zing"],
  "Yobe": ["Damaturu", "Potiskum", "Gashua", "Nguru", "Geidam"],
  "Zamfara": ["Gusau", "Kaura Namoda", "Talata Mafara", "Anka", "Zurmi"]
};

export const isValidState = (state) => NIGERIA_STATES.includes(state);

export const isValidCityForState = (state, city) => {
  const cities = NIGERIA_CITIES_BY_STATE[state];
  if (!cities) return false;
  // Allow any freeform city/town too — the list above covers major towns,
  // but Nigeria has thousands of towns/wards we can't fully enumerate.
  // We only strictly validate the state; city is checked for length/format
  // in the validator, not against this list, so sellers in smaller towns
  // aren't blocked from registering.
  return true;
};
