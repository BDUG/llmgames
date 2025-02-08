Pirate Game Development Specification

Objective:
Create a fully functional 2D pirate-themed game as a single-file HTML document containing all necessary HTML, CSS, and JavaScript. The game should be playable directly in a web browser without requiring external dependencies.

World & Generation:
    - World Dimensions:
        - Large 2D world (2400×1600)
        - The canvas is 800×600, requiring a camera system centered on the player.
    - Nations:
        - Four possible nations: Netherlands, Spain, France, and England.
        - Each nation is represented by a Unicode flag:
            - Netherlands (U+1F1F3, U+1F1F1)
            - Spain (U+1F1EA, U+1F1F8)
            - France (U+1F1EB, U+1F1F7)
            - England (U+1F1EC, U+1F1E7)
        - Relationship system:
            - Each pair of nations can be in "peace" or "war."
            - Relationships randomly toggle every 120 seconds.
            - Enemy warships attack the player if their nation is at war with the player’s nation.
        - Cities and enemy ships are randomly assigned a nation while maintaining balanced representation.

Game Objects:
    Islands:
        - Generate 20 islands randomly using polygonal shapes.
        - Each island must have at least one city placed on the coastline.

    Cities:
        - Each city includes:
            - Name (e.g., "City 1", "City 2")
            - Nation (Netherlands, Spain, France, England)
            - Population (dynamic birth rate, death rate, trading, and production)
            - Selection of tradeable goods (Rum, Spices, Gold) with fluctuating prices.
        - Visuals:
            - City location marked with Unicode 🏠 (U+26EA).
            - Small flag near each city, reflecting its nation.

    Ships:
        - Ships are spawned in water near a city and cannot be placed on land.
        - If a ship mistakenly appears on land, it is replaced at the water close to the next city.
        - Can not move on and cross island (land). 
        - Cannot traverse land.
        - Visuals:
            - Ships are represented by Unicode ⛵ (U+26F5).
        - Ship attributes:
            - Nation: Netherlands, Spain, France, or England.
            - Inventory: Stores tradeable goods.
            - Ship type: "Sloop", "Brig", or "Galleon" (different crew, cannons, and cargo capacity).
            - Position & Movement: X/Y coordinates, angle (rotation), speed.
            - Health: Tracks ship durability.
        - Enemy Ships:
            - Assigned a home city but trade with other cities.
            - Follows a navigation algorithm that avoids islands.
            - Has gold, goods, and a planned trade route.
            - The trade route is defined by a randomly selected target city.
        - Player’s Ship:
            - Starts near an English city (if available) in a random water location.

    Cannonballs:
        - Ships can fire cannonballs (black circles, 10px in size).
        - Mechanics:
            - Players fire using the spacebar.
            - Each cannonball has a position, angle, speed, damage, and range.
            - Disappears on collision or after exceeding its range.

Controls:
    While Playing:
        - Arrow Keys (← →): Rotate the ship.
        - Up Arrow (↑): Move forward.
        - Space: Fire cannons.
        - P: Pause/unpause.
        - M: Toggle minimap.
        - S: Save game.
        - L: Load game.
        - T: Initiate trading (when near a city).
        - C: Capture an enemy ship.

    While Trading:
        - 1,2,3: Buy goods.
        - Q,W,E: Sell goods.
        - 4: Buy a cannon.
        - R: Recruit crew.
        - V: Sell a captured ship.
        - Y: Sell a cannon.
        - T: End trading.

Camera System:
    - The camera is always centered on the player’s ship.
    - Only the 800×600 visible area is rendered at any time.

User Interface (UI):
   Gamemap:
      - Displayed in the upper left corner.
      - Displays in size 800x600.

   Minimap:
      - Displayed in the upper right corner. 
      - Displays a scaled-down 200×200 version of the world.
      - Shows islands, cities, and player location.

   HUD (Heads-Up Display):
      - Located below the minimap in the top-left corner.
      - Displays:
         - Player HP
         - Money
         - Crew (current/max)
         - Ship type
         - Nation
         - Number of cannons

   Log console:
      - Located below the game map.
      - Showing game debug information.

   Trade menu:
      - Sell and buy goods.
      - Sell and buy cannons.
      - Sell and buy ships.
      - Showing the players amount.
      - Showing the city amount. 

Game Mechanics:
   Capturing Ships:
      - If an enemy ship’s HP drops below 15 and is near the player, pressing C allows capture.
      - The player can choose to:
         - Take over → The ship follows the player as a captured ship.
         - Sink → Grants loot and removes the ship.
      - Captured ships can be sold at a trade interface by pressing V.

   Trading System:
      - Initiation: Press T near a city to enter trading mode (pausing movement/combat), opening the trade menu. 
      - Trade Options:
         - Buy/sell goods (1,2,3 to buy; Q,W,E to sell).
         - Buy/sell cannons (4 to buy; Y to sell).
         - Recruit crew (R).
         - Sell captured ships (V).
      - Exit Trade: Press T again to resume gameplay, closign the trade menu.

   Combat System:
      - Warships fire automatically at the player when in range.
      - Players can fire back with cannons.
      - If the player is actively trading, enemy ships do not attack.

   Health & Respawning:
      - If HP reaches 0, the player "dies" and respawns at the nearest city with:
         - A basic "Sloop" ship
         - 100 gold
         - 100 HP
         - 10 crew members
      - Respawn logic:
         - The player is placed at the nearest city.
         - Logs a message in the console.

   Routing:
      - Collisions with islands are avoided.
      - The shortest route will be choosen. 
      - Ships not cross island (land).


>==<

make that ships always move

>==<

players ship only move on key pressed

>==<

if enemy ship stuck at island (land) set it to the water close to the island