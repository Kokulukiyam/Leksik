# Catégories Wikimedia Commons pour les termes de Leksik

Pour chaque terme du fichier d'entrée (id, terme français, définition, requêtes), propose de 2 à 4 noms de
**catégories Wikimedia Commons** susceptibles de contenir de nombreuses PHOTOS réelles de cet élément.

- Noms exacts selon les conventions de Commons : en anglais, pluriel, majuscule initiale seulement
  (« Category:Steel roof trusses », « Category:Strip foundations », « Category:Gravel », « Category:Trowels »,
  « Category:Corrugated iron roofs », « Category:Rebar », « Category:Concrete formwork »).
- De la plus précise à la plus large ; la plus large doit rester centrée sur l'objet (pas « Category:Construction »).
- Si l'objet est typique d'Afrique de l'Ouest, ajoute si possible une catégorie géographique
  (« Category:Mud brick architecture in Mali », « Category:Concrete blocks in Senegal »).
- N'invente pas au hasard : si tu doutes qu'une catégorie existe, propose plutôt un nom générique très probable.
  Les noms seront vérifiés automatiquement ; ceux qui n'existent pas seront ignorés.
- N'interroge PAS Commons ni internet.

Sortie : un objet JSON `{ "<id>": ["Category:…", "Category:…"], … }` avec TOUS les ids du fichier d'entrée.
