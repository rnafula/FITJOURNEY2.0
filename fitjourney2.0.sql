CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstname VARCHAR(50),
  lastname VARCHAR(50),
  username VARCHAR(50) UNIQUE,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  role ENUM('user', 'nutritionist', 'fit_instructor', 'admin'),
  habit VARCHAR(100), -- only for 'user'//remove we will have a habits table
  client_charges DECIMAL(10,2), -- only for professionals
  license VARCHAR(255), -- only for professionals
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


--seed data for meals table
-- Day 1
INSERT INTO meals (meal_plan_id, day_number, meal_type, description) VALUES
(6, 1, 'breakfast', 'Black tea without sugar + sweet potatoes'),
(6, 1, 'lunch', 'Ugali + sukuma wiki (kale) + small fish (omena)'),
(6, 1, 'dinner', 'Boiled maize and beans (githeri) with avocado');

-- Day 2
INSERT INTO meals (meal_plan_id, day_number, meal_type, description) VALUES
(6, 2, 'breakfast', 'Millet porridge + roasted groundnuts'),
(6, 2, 'lunch', 'Ugali + kunde (cowpea leaves) + boiled egg'),
(6, 2, 'dinner', 'Rice + ndengu (green grams) + kachumbari');

-- Day 3
INSERT INTO meals (meal_plan_id, day_number, meal_type, description) VALUES
(6, 3, 'breakfast', 'Chapati (1 piece) + black tea + boiled green bananas'),
(6, 3, 'lunch', 'Ugali + cabbage + grilled tilapia'),
(6, 3, 'dinner', 'Pumpkin + beans stew + traditional vegetables (terere)');

-- Day 4
INSERT INTO meals (meal_plan_id, day_number, meal_type, description) VALUES
(6, 4, 'breakfast', 'Black tea + boiled cassava'),
(6, 4, 'lunch', 'Ugali + managu (African nightshade) + fried omena'),
(6, 4, 'dinner', 'Boiled sweet potatoes + ndengu stew');

-- Day 5
INSERT INTO meals (meal_plan_id, day_number, meal_type, description) VALUES
(6, 5, 'breakfast', 'Sorghum porridge + roasted groundnuts'),
(6, 5, 'lunch', 'Ugali + sukuma wiki + beans stew'),
(6, 5, 'dinner', 'Rice + kunde + boiled egg');

-- Day 6
INSERT INTO meals (meal_plan_id, day_number, meal_type, description) VALUES
(6, 6, 'breakfast', 'Black tea + boiled arrowroots'),
(6, 6, 'lunch', 'Ugali + cabbage + fried tilapia'),
(6, 6, 'dinner', 'Githeri (maize + beans) + avocado');

-- Day 7
INSERT INTO meals (meal_plan_id, day_number, meal_type, description) VALUES
(6, 7, 'breakfast', 'Millet porridge + boiled green bananas'),
(6, 7, 'lunch', 'Ugali + managu + chicken stew (light portion)'),
(6, 7, 'dinner', 'Pumpkin + ndengu stew + kachumbari');
