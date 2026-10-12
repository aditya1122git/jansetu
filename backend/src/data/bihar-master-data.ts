export type Reservation = 'GEN' | 'SC' | 'ST';

type DistrictDefinition = {
  id: number;
  code: string;
  name: string;
  firstAc: number;
  lastAc: number;
};

export const BIHAR_DISTRICTS: DistrictDefinition[] = [
  { id: 1, code: 'WCH', name: 'West Champaran', firstAc: 1, lastAc: 9 },
  { id: 2, code: 'ECH', name: 'East Champaran', firstAc: 10, lastAc: 21 },
  { id: 3, code: 'SHE', name: 'Sheohar', firstAc: 22, lastAc: 22 },
  { id: 4, code: 'SIT', name: 'Sitamarhi', firstAc: 23, lastAc: 30 },
  { id: 5, code: 'MAD', name: 'Madhubani', firstAc: 31, lastAc: 40 },
  { id: 6, code: 'SUP', name: 'Supaul', firstAc: 41, lastAc: 45 },
  { id: 7, code: 'ARA', name: 'Araria', firstAc: 46, lastAc: 51 },
  { id: 8, code: 'KIS', name: 'Kishanganj', firstAc: 52, lastAc: 55 },
  { id: 9, code: 'PUR', name: 'Purnia', firstAc: 56, lastAc: 62 },
  { id: 10, code: 'KAT', name: 'Katihar', firstAc: 63, lastAc: 69 },
  { id: 11, code: 'MDP', name: 'Madhepura', firstAc: 70, lastAc: 73 },
  { id: 12, code: 'SAH', name: 'Saharsa', firstAc: 74, lastAc: 77 },
  { id: 13, code: 'DAR', name: 'Darbhanga', firstAc: 78, lastAc: 87 },
  { id: 14, code: 'MUZ', name: 'Muzaffarpur', firstAc: 88, lastAc: 98 },
  { id: 15, code: 'GOP', name: 'Gopalganj', firstAc: 99, lastAc: 104 },
  { id: 16, code: 'SIW', name: 'Siwan', firstAc: 105, lastAc: 112 },
  { id: 17, code: 'SAR', name: 'Saran', firstAc: 113, lastAc: 122 },
  { id: 18, code: 'VAI', name: 'Vaishali', firstAc: 123, lastAc: 130 },
  { id: 19, code: 'SAM', name: 'Samastipur', firstAc: 131, lastAc: 140 },
  { id: 20, code: 'BEG', name: 'Begusarai', firstAc: 141, lastAc: 147 },
  { id: 21, code: 'KHA', name: 'Khagaria', firstAc: 148, lastAc: 151 },
  { id: 22, code: 'BHA', name: 'Bhagalpur', firstAc: 152, lastAc: 158 },
  { id: 23, code: 'BAN', name: 'Banka', firstAc: 159, lastAc: 163 },
  { id: 24, code: 'MUN', name: 'Munger', firstAc: 164, lastAc: 166 },
  { id: 25, code: 'LAK', name: 'Lakhisarai', firstAc: 167, lastAc: 168 },
  { id: 26, code: 'SHP', name: 'Sheikhpura', firstAc: 169, lastAc: 170 },
  { id: 27, code: 'NAL', name: 'Nalanda', firstAc: 171, lastAc: 177 },
  { id: 28, code: 'PAT', name: 'Patna', firstAc: 178, lastAc: 191 },
  { id: 29, code: 'BHO', name: 'Bhojpur', firstAc: 192, lastAc: 198 },
  { id: 30, code: 'BUX', name: 'Buxar', firstAc: 199, lastAc: 202 },
  { id: 31, code: 'KAI', name: 'Kaimur (Bhabua)', firstAc: 203, lastAc: 206 },
  { id: 32, code: 'ROH', name: 'Rohtas', firstAc: 207, lastAc: 213 },
  { id: 33, code: 'ARW', name: 'Arwal', firstAc: 214, lastAc: 215 },
  { id: 34, code: 'JEH', name: 'Jehanabad', firstAc: 216, lastAc: 218 },
  { id: 35, code: 'AUR', name: 'Aurangabad', firstAc: 219, lastAc: 224 },
  { id: 36, code: 'GAY', name: 'Gaya', firstAc: 225, lastAc: 234 },
  { id: 37, code: 'NAW', name: 'Nawada', firstAc: 235, lastAc: 239 },
  { id: 38, code: 'JAM', name: 'Jamui', firstAc: 240, lastAc: 243 }
];

const constituencyNames = `
Valmiki Nagar
Ramnagar (SC)
Narkatiaganj
Bagaha
Lauriya
Nautan
Chanpatia
Bettiah
Sikta
Raxaul
Sugauli
Narkatia
Harsidhi (SC)
Govindganj
Kesaria
Kalyanpur
Pipra
Madhuban
Motihari
Chiraia
Dhaka
Sheohar
Riga
Bathnaha (SC)
Parihar
Sursand
Bajpatti
Sitamarhi
Runnisaidpur
Belsand
Harlakhi
Benipatti
Khajauli
Babubarhi
Bisfi
Madhubani
Rajnagar (SC)
Jhanjharpur
Phulparas
Laukaha
Nirmali
Pipra
Supaul
Triveniganj (SC)
Chhatapur
Narpatganj
Raniganj (SC)
Forbesganj
Araria
Jokihat
Sikti
Bahadurganj
Thakurganj
Kishanganj
Kochadhaman
Amour
Baisi
Kasba
Banmankhi (SC)
Rupauli
Dhamdaha
Purnia
Katihar
Kadwa
Balrampur
Pranpur
Manihari (ST)
Barari
Korha (SC)
Alamnagar
Bihariganj
Singheshwar (SC)
Madhepura
Sonbarsha (SC)
Saharsa
Simri Bakhtiarpur
Mahishi
Kusheshwar Asthan (SC)
Gaura Bauram
Benipur
Alinagar
Darbhanga Rural
Darbhanga
Hayaghat
Bahadurpur
Keoti
Jale
Gaighat
Aurai
Minapur
Bochaha (SC)
Sakra (SC)
Kurhani
Muzaffarpur
Kanti
Baruraj
Paroo
Sahebganj
Baikunthpur
Barauli
Gopalganj
Kuchaikote
Bhorey (SC)
Hathua
Siwan
Ziradei
Darauli (SC)
Raghunathpur
Daraundha
Barharia
Goriakothi
Maharajganj
Ekma
Manjhi
Baniapur
Taraiya
Marhaura
Chapra
Garkha (SC)
Amnour
Parsa
Sonepur
Hajipur
Lalganj
Vaishali
Mahua
Raja Pakar (SC)
Raghopur
Mahnar
Patepur (SC)
Kalyanpur (SC)
Warisnagar
Samastipur
Ujiarpur
Morwa
Sarairanjan
Mohiuddinnagar
Bibhutipur
Rosera (SC)
Hasanpur
Cheria Bariarpur
Bachhwara
Teghra
Matihani
Sahebpur Kamal
Begusarai
Bakhri (SC)
Alauli (SC)
Khagaria
Beldaur
Parbatta
Bihpur
Gopalpur
Pirpainti (SC)
Kahalgaon
Bhagalpur
Sultanganj
Nathnagar
Amarpur
Dhauraiya (SC)
Banka
Katoria (ST)
Belhar
Tarapur
Munger
Jamalpur
Suryagarha
Lakhisarai
Sheikhpura
Barbigha
Asthawan
Biharsharif
Rajgir (SC)
Islampur
Hilsa
Nalanda
Harnaut
Mokama
Barh
Bakhtiarpur
Digha
Bankipur
Kumhrar
Patna Sahib
Fatuha
Danapur
Maner
Phulwari (SC)
Masaurhi (SC)
Paliganj
Bikram
Sandesh
Barhara
Arrah
Agiaon (SC)
Tarari
Jagdishpur
Shahpur
Brahampur
Buxar
Dumraon
Rajpur (SC)
Ramgarh
Mohania (SC)
Bhabua
Chainpur
Chenari (SC)
Sasaram
Kargahar
Dinara
Nokha
Dehri
Karakat
Arwal
Kurtha
Jehanabad
Ghosi
Makhdumpur (SC)
Goh
Obra
Nabinagar
Kutumba (SC)
Aurangabad
Rafiganj
Gurua
Sherghati
Imamganj (SC)
Barachatti (SC)
Bodh Gaya (SC)
Gaya Town
Tikari
Belaganj
Atri
Wazirganj
Rajauli (SC)
Hisua
Nawada
Gobindpur
Warsaliganj
Sikandra (SC)
Jamui
Jhajha
Chakai
`.trim().split('\n');

if (constituencyNames.length !== 243) {
  throw new Error(`Bihar master data must contain 243 constituencies; found ${constituencyNames.length}.`);
}

export const BIHAR_CONSTITUENCIES = constituencyNames.map((sourceName, index) => {
  const acNumber = index + 1;
  const reservationMatch = sourceName.match(/ \((SC|ST)\)$/);
  const reservation: Reservation = reservationMatch ? reservationMatch[1] as Reservation : 'GEN';
  const name = sourceName.replace(/ \((SC|ST)\)$/, '');
  const district = BIHAR_DISTRICTS.find(item => acNumber >= item.firstAc && acNumber <= item.lastAc);
  if (!district) throw new Error(`No district mapping found for AC ${acNumber}.`);

  return {
    id: acNumber,
    acNumber,
    acCode: `AC${String(acNumber).padStart(3, '0')}`,
    name,
    reservation,
    districtId: district.id,
    isActive: true
  };
});

export function validateBiharMasterData() {
  const districtSeatTotal = BIHAR_DISTRICTS.reduce(
    (total, district) => total + district.lastAc - district.firstAc + 1,
    0
  );
  const uniqueAcNumbers = new Set(BIHAR_CONSTITUENCIES.map(item => item.acNumber));

  if (BIHAR_DISTRICTS.length !== 38) throw new Error('Expected exactly 38 Bihar districts.');
  if (districtSeatTotal !== 243) throw new Error(`District ranges cover ${districtSeatTotal} seats, expected 243.`);
  if (uniqueAcNumbers.size !== 243) throw new Error('Assembly constituency numbers are not unique.');
}
