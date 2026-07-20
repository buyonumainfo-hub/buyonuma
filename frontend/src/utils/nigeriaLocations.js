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
  "Abia": ["Aba", "Umuahia", "Ohafia", "Arochukwu", "Isiala Ngwa", "Bende", "Ikwuano", "Isuikwuato", "Obingwa", "Ugwunagbo", "Umunneochi", "Osisioma", "Ntigha"],
  "Adamawa": ["Yola", "Mubi", "Numan", "Ganye", "Jimeta", "Gombi", "Hong", "Michika", "Mayo-Belwa", "Guyuk", "Toungo", "Song", "Girei"],
  "Akwa Ibom": ["Uyo", "Eket", "Ikot Ekpene", "Oron", "Abak", "Ikot Abasi", "Etinan", "Itu", "Ikono", "Onna", "Nsit Ibom", "Essien Udim", "Ika"],
  "Anambra": ["Awka", "Onitsha", "Nnewi", "Ekwulobia", "Aguata", "Ihiala", "Nkpor", "Ogidi", "Nteje", "Ozubulu", "Umunze", "Atani", "Awkuzu"],
  "Bauchi": ["Bauchi", "Azare", "Misau", "Jama'are", "Ningi", "Katagum", "Dass", "Tafawa Balewa", "Toro", "Alkaleri", "Bogoro", "Darazo", "Giade"],
  "Bayelsa": ["Yenagoa", "Brass", "Sagbama", "Ogbia", "Nembe", "Amassoma", "Kolokuma", "Ekeremor", "Southern Ijaw", "Otuoke", "Oloibiri"],
  "Benue": ["Makurdi", "Gboko", "Otukpo", "Katsina-Ala", "Vandeikya", "Adikpo", "Gwer", "Ugbokolo", "Zaki Biam", "Naka", "Ihugh", "Anyiin", "Ikpayongo"],
  "Borno": ["Maiduguri", "Biu", "Bama", "Dikwa", "Konduga", "Gwoza", "Chibok", "Damboa", "Askira", "Kukawa", "Mafa", "Monguno", "Ngala"],
  "Cross River": ["Calabar", "Ikom", "Ogoja", "Ugep", "Obudu", "Akamkpa", "Ikot Okpora", "Obubra", "Biase", "Boki", "Bekwarra", "Etung", "Yala"],
  "Delta": ["Warri", "Asaba", "Sapele", "Ughelli", "Agbor", "Abraka", "Oghara", "Ozoro", "Kwale", "Burutu", "Bomadi", "Effurun", "Oleh", "Ubulu-Uku"],
  "Ebonyi": ["Abakaliki", "Afikpo", "Onueke", "Ezza", "Ikwo", "Edda", "Ishieke", "Ohaozara", "Ivo", "Ngbo", "Nkalagu", "Uburu", "Ezzamgbo"],
  "Edo": ["Benin City", "Auchi", "Ekpoma", "Uromi", "Igarra", "Ubiaja", "Igueben", "Iruekpen", "Sabongida-Ora", "Fugar", "Okpella", "Sakponba", "Irrua"],
  "Ekiti": ["Ado-Ekiti", "Ikere-Ekiti", "Ilawe-Ekiti", "Oye-Ekiti", "Ikole-Ekiti", "Efon-Alaaye", "Ise-Ekiti", "Aramoko-Ekiti", "Igbara-Odo", "Ijero-Ekiti", "Emure-Ekiti", "Ido-Ekiti"],
  "Enugu": ["Enugu", "Nsukka", "Awgu", "Agbani", "Oji River", "Udi", "Nike", "Ngwo", "Enugu-Ezike", "Obollo-Afor", "Ozalla", "Achi", "Orba"],
  "FCT (Abuja)": ["Abuja Central", "Gwagwalada", "Kuje", "Bwari", "Kubwa", "Lugbe", "Garki", "Wuse", "Maitama", "Asokoro", "Nyanya", "Karu", "Jikwoyi", "Gwarinpa", "Karshi", "Dutse", "Kwali", "Abaji", "Life Camp"],
  "Gombe": ["Gombe", "Kaltungo", "Billiri", "Dukku", "Kumo", "Deba", "Kaltungo", "Nafada", "Bajoga", "Kwami", "Yamaltu Deba", "Balanga", "Shongom"],
  "Imo": ["Owerri", "Orlu", "Okigwe", "Mbaise", "Oguta", "Mgbidi", "Nkwerre", "Umuahia Road", "Ihiagwa", "Amaigbo", "Nnewi", "Ideato", "Obowo"],
  "Jigawa": ["Dutse", "Hadejia", "Gumel", "Kazaure", "Birnin Kudu", "Ringim", "Gwaram", "Kiyawa", "Malam Madori", "Miga", "Auyo", "Babura", "Buji"],
  "Kaduna": ["Kaduna", "Zaria", "Kafanchan", "Sabon Gari", "Soba", "Zonkwa", "Saminaka", "Kagoro", "Kachia", "Birnin Gwari", "Ikara", "Jaba", "Makarfi", "Pambeguwa"],
  "Kano": ["Kano", "Wudil", "Gwarzo", "Rano", "Bichi", "Dawakin Tofa", "Gaya", "Kura", "Tudun Wada", "Rimin Gado", "Bagwai", "Gwale", "Nassarawa", "Fagge"],
  "Katsina": ["Katsina", "Funtua", "Daura", "Malumfashi", "Kankia", "Dutsin-Ma", "Mani", "Kaita", "Ingawa", "Bakori", "Charanchi", "Faskari", "Batsari"],
  "Kebbi": ["Birnin Kebbi", "Argungu", "Yauri", "Zuru", "Jega", "Bagudo", "Aliero", "Suru", "Ngaski", "Bunza", "Koko", "Dandi", "Wasagu"],
  "Kogi": ["Lokoja", "Okene", "Idah", "Kabba", "Ankpa", "Anyigba", "Ajaokuta", "Dekina", "Kotonkarfe", "Isanlu", "Okengwe", "Ogaminana", "Egbe"],
  "Kwara": ["Ilorin", "Offa", "Omu-Aran", "Lafiagi", "Jebba", "Patigi", "Kaiama", "Erin-Ile", "Share", "Isanlu-Isin", "Malete", "Babanla", "Pategi"],
  "Lagos": ["Ikeja", "Lekki", "Victoria Island", "Surulere", "Yaba", "Ikorodu", "Badagry", "Epe", "Ajah", "Apapa", "Alimosho", "Agege", "Mushin", "Oshodi", "Ikoyi", "Ojo", "Festac", "Magodo", "Ojota", "Egbeda", "Ipaja", "Sango Ota Boundary", "Ilupeju"],
  "Nasarawa": ["Lafia", "Keffi", "Akwanga", "Nasarawa", "Doma", "Karu", "Toto", "Lafia East", "Wamba", "Awe", "Obi", "Nasarawa Eggon", "Keana"],
  "Niger": ["Minna", "Bida", "Suleja", "Kontagora", "Lapai", "New Bussa", "Kagara", "Zungeru", "Agaie", "Mokwa", "Rijau", "Wushishi", "Kuta", "Bosso"],
  "Ogun": ["Abeokuta", "Ijebu-Ode", "Sagamu", "Ota", "Ilaro", "Sango-Ota", "Ijebu-Igbo", "Owode", "Ifo", "Ayetoro", "Ago-Iwoye", "Iperu", "Imeko", "Ewekoro"],
  "Ondo": ["Akure", "Ondo City", "Owo", "Ikare-Akoko", "Okitipupa", "Ile-Oluji", "Ese-Odo", "Igbokoda", "Ore", "Idanre", "Irele", "Akungba-Akoko", "Ikare"],
  "Osun": ["Osogbo", "Ile-Ife", "Ilesa", "Ede", "Iwo", "Ikire", "Ikirun", "Ejigbo", "Ila Orangun", "Gbongan", "Modakeke", "Ipetu-Ijesa", "Ilobu"],
  "Oyo": ["Ibadan", "Ogbomoso", "Oyo Town", "Iseyin", "Saki", "Eruwa", "Igbo-Ora", "Okeho", "Kishi", "Ago-Are", "Fiditi", "Igboho", "Lalupon", "Ijaye"],
  "Plateau": ["Jos", "Bukuru", "Pankshin", "Shendam", "Barkin Ladi", "Vom", "Langtang", "Riyom", "Mangu", "Wase", "Bassa", "Kanke", "Anguwan Rukuba"],
  "Rivers": ["Port Harcourt", "Obio-Akpor", "Bonny", "Eleme", "Okrika", "Ahoada", "Bori", "Degema", "Omoku", "Buguma", "Ikwerre", "Oyigbo", "Emohua", "Rumuola"],
  "Sokoto": ["Sokoto", "Tambuwal", "Wurno", "Gwadabawa", "Illela", "Sabon Birni", "Bodinga", "Rabah", "Goronyo", "Gada", "Isa", "Tureta", "Wamako"],
  "Taraba": ["Jalingo", "Wukari", "Bali", "Gembu", "Zing", "Serti", "Ibi", "Takum", "Baissa", "Mutum-Biyu", "Karim Lamido", "Lau", "Donga"],
  "Yobe": ["Damaturu", "Potiskum", "Gashua", "Nguru", "Geidam", "Buni Yadi", "Bade", "Fika", "Gujba", "Machina", "Nangere", "Yunusari", "Tarmuwa"],
  "Zamfara": ["Gusau", "Kaura Namoda", "Talata Mafara", "Anka", "Zurmi", "Bungudu", "Maru", "Bakura", "Shinkafi", "Tsafe", "Gummi", "Birnin Magaji"]
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
