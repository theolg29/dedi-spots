import { mutation } from "./_generated/server";
import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

async function createUser(
  ctx: MutationCtx,
  data: { name: string; email: string; image: string }
): Promise<Id<"users">> {
  const existing = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", data.email))
    .unique();
  if (existing) return existing._id;
  return await ctx.db.insert("users", data);
}

// Supprime tous les spots existants ainsi que tout ce qui en dépend
// (avis, favoris, notifications liées) pour repartir sur une base propre.
export const resetSpots = mutation({
  args: {},
  handler: async (ctx) => {
    const spots = await ctx.db.query("spots").collect();

    for (const spot of spots) {
      const reviews = await ctx.db
        .query("reviews")
        .withIndex("by_spot", (q) => q.eq("spotId", spot._id))
        .collect();
      for (const review of reviews) await ctx.db.delete(review._id);

      const favorites = await ctx.db
        .query("favorites")
        .withIndex("by_spot", (q) => q.eq("spotId", spot._id))
        .collect();
      for (const favorite of favorites) await ctx.db.delete(favorite._id);

      const notifications = await ctx.db.query("notifications").collect();
      for (const n of notifications) {
        if (n.spotId === spot._id) await ctx.db.delete(n._id);
      }

      await ctx.db.delete(spot._id);
    }

    return { message: `${spots.length} spot(s) supprimé(s).` };
  },
});

// Crée une dizaine de spots réels autour de Toulon, avec photos (Wikimedia
// Commons — banque d'images libres de droit) et avis.
export const seedToulon = mutation({
  args: {},
  handler: async (ctx) => {
    const marie = await createUser(ctx, {
      name: "Marie Dupont",
      email: "marie@spots.app",
      image: "https://i.pravatar.cc/150?img=47",
    });
    const lucas = await createUser(ctx, {
      name: "Lucas Bernard",
      email: "lucas@spots.app",
      image: "https://i.pravatar.cc/150?img=12",
    });
    const emma = await createUser(ctx, {
      name: "Emma Leclerc",
      email: "emma@spots.app",
      image: "https://i.pravatar.cc/150?img=32",
    });
    const theo = await createUser(ctx, {
      name: "Théo Martin",
      email: "theo@spots.app",
      image: "https://i.pravatar.cc/150?img=8",
    });
    const sofia = await createUser(ctx, {
      name: "Sofia Ramos",
      email: "sofia@spots.app",
      image: "https://i.pravatar.cc/150?img=25",
    });
    const nicolas = await createUser(ctx, {
      name: "Nicolas Girard",
      email: "nicolas@spots.app",
      image: "https://i.pravatar.cc/150?img=14",
    });
    const camille = await createUser(ctx, {
      name: "Camille Roux",
      email: "camille@spots.app",
      image: "https://i.pravatar.cc/150?img=44",
    });
    const julie = await createUser(ctx, {
      name: "Julie Fabre",
      email: "julie@spots.app",
      image: "https://i.pravatar.cc/150?img=48",
    });

    const now = Date.now();
    const day = 86400000;

    type ReviewSeed = { userId: Id<"users">; rating: number; comment: string; ago: number };
    type SpotSeed = {
      creatorId: Id<"users">;
      title: string;
      description: string;
      latitude: number;
      longitude: number;
      city: string;
      photos: string[];
      tags: string[];
      ago: number;
      reviews: ReviewSeed[];
    };

    const spots: SpotSeed[] = [
      {
        creatorId: marie,
        title: "Panorama du Mont Faron",
        description:
          "Accessible en voiture, à pied ou en téléphérique depuis le centre-ville, le Mont Faron domine la rade de Toulon à 584m d'altitude. La vue embrasse toute la ville, le port militaire, la presqu'île de Saint-Mandrier et les îles au large. Un des plus beaux points de vue de la Côte varoise, particulièrement au coucher de soleil quand la rade s'embrase.",
        latitude: 43.1417,
        longitude: 5.9331,
        city: "Toulon",
        photos: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Toulon_depuis_le_Faron.jpg/1280px-Toulon_depuis_le_Faron.jpg",
          "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Panorama_du_Mont_Faron_%C3%A0_Toulon_%28La_rade%29_-1-cliche_Jean_Weber-2.jpg/1280px-Panorama_du_Mont_Faron_%C3%A0_Toulon_%28La_rade%29_-1-cliche_Jean_Weber-2.jpg",
        ],
        tags: ["Panorama", "Montagne", "Coucher de soleil"],
        ago: 12 * day,
        reviews: [
          { userId: lucas, rating: 5, comment: "Le téléphérique vaut vraiment le coup, la vue sur la rade est à couper le souffle. À faire en fin de journée.", ago: 11 * day },
          { userId: emma, rating: 5, comment: "On voit toute la ville et les îles au loin. Prévoir une petite laine, il y a du vent là-haut.", ago: 9 * day },
          { userId: nicolas, rating: 4, comment: "Superbe panorama mais beaucoup de monde le week-end. Y aller en semaine si possible.", ago: 6 * day },
          { userId: camille, rating: 5, comment: "Coucher de soleil magique, la rade devient orange. Un des meilleurs spots de Toulon.", ago: 2 * day },
        ],
      },
      {
        creatorId: lucas,
        title: "Plage du Mourillon",
        description:
          "La grande plage familiale de Toulon, aménagée sur plusieurs criques de sable fin séparées par des rochers. Eau turquoise peu profonde idéale pour les enfants, nombreux restaurants et le parc de la Méditerranée juste derrière. Le quartier du Mourillon avec ses jardins et sa jetée fait aussi le charme du lieu.",
        latitude: 43.1103,
        longitude: 5.9436,
        city: "Toulon",
        photos: [
          "https://upload.wikimedia.org/wikipedia/commons/0/0b/Toulon_-_Plage_du_Mourillon_-_panoramio.jpg",
          "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Plages_du_Mourillon_a_Toulon.jpg/1280px-Plages_du_Mourillon_a_Toulon.jpg",
        ],
        tags: ["Plage", "Urbain"],
        ago: 20 * day,
        reviews: [
          { userId: marie, rating: 4, comment: "Eau claire et peu profonde, parfait avec des enfants. Ça se remplit vite en été.", ago: 18 * day },
          { userId: theo, rating: 4, comment: "Plage sympa en plein centre-ville, plusieurs criques pour éviter la foule. Snack correct juste à côté.", ago: 15 * day },
          { userId: sofia, rating: 5, comment: "Mon spot préféré pour un bain rapide après le boulot, à 10 min à pied du centre.", ago: 4 * day },
        ],
      },
      {
        creatorId: emma,
        title: "Sentier littoral du Cap Brun",
        description:
          "Un sentier côtier qui longe les anciennes batteries militaires du Cap Brun, entre pins parasols et criques rocheuses. La pointe ouest offre une vue dégagée sur la grande rade et les collines toulonnaises. Moins fréquenté que le Mourillon, idéal pour une balade tranquille en fin d'après-midi.",
        latitude: 43.1080,
        longitude: 5.9704,
        city: "Toulon",
        photos: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Toulon%2C_cap_Brun%2C_pointe_ouest.jpg/1280px-Toulon%2C_cap_Brun%2C_pointe_ouest.jpg",
          "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Cap_Brun.jpg/1280px-Cap_Brun.jpg",
        ],
        tags: ["Nature", "Panorama"],
        ago: 16 * day,
        reviews: [
          { userId: julie, rating: 5, comment: "Sentier magnifique et tranquille, très peu de monde même en été. Les anciens forts ajoutent du charme.", ago: 14 * day },
          { userId: nicolas, rating: 4, comment: "Belle balade ombragée avec de jolis points de vue sur la rade. Prévoir de bonnes chaussures.", ago: 8 * day },
        ],
      },
      {
        creatorId: theo,
        title: "Port du Brusc",
        description:
          "Petit port de pêche authentique niché à Six-Fours-les-Plages, point de départ des navettes vers l'île des Embiez. Les ruelles du village et les barques colorées amarrées le long du quai donnent un vrai cachet provençal, loin de l'agitation de Toulon.",
        latitude: 43.0765,
        longitude: 5.8607,
        city: "Six-Fours-les-Plages",
        photos: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Le_village_du_Brusc.JPG/1280px-Le_village_du_Brusc.JPG",
          "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Bateau_%C3%AEle_des_embiez.jpg/1280px-Bateau_%C3%AEle_des_embiez.jpg",
        ],
        tags: ["Urbain", "Patrimoine"],
        ago: 25 * day,
        reviews: [
          { userId: sofia, rating: 4, comment: "Adorable petit port, on sent le vrai village de pêcheurs. Bien pour prendre la navette vers les Embiez.", ago: 22 * day },
          { userId: camille, rating: 5, comment: "Coup de cœur pour l'ambiance authentique et les glaciers du quai. Très photogénique au coucher du soleil.", ago: 10 * day },
          { userId: marie, rating: 4, comment: "Parking un peu compliqué en haute saison mais le village vaut le détour.", ago: 3 * day },
        ],
      },
      {
        creatorId: sofia,
        title: "Cap Sicié",
        description:
          "Pointe sauvage à l'extrémité de la presqu'île du Cap Sicié, entre Six-Fours et La Seyne-sur-Mer. Falaises déchiquetées battues par le vent, criques accessibles uniquement à pied et vue lointaine sur les calanques de Marseille par temps clair. Un des rares coins encore préservés du littoral toulonnais.",
        latitude: 43.0625,
        longitude: 5.8452,
        city: "Six-Fours-les-Plages",
        photos: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Cap_Sici%C3%A9_%281%29.jpg/1280px-Cap_Sici%C3%A9_%281%29.jpg",
          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/C%C3%B4te_du_Cap_Sici%C3%A9_en_hiver_%28janvier_2006%29.jpg/1280px-C%C3%B4te_du_Cap_Sici%C3%A9_en_hiver_%28janvier_2006%29.jpg",
        ],
        tags: ["Nature", "Panorama"],
        ago: 30 * day,
        reviews: [
          { userId: lucas, rating: 5, comment: "Paysage impressionnant, on se croirait presque en Bretagne avec la houle qui frappe les rochers.", ago: 27 * day },
          { userId: emma, rating: 5, comment: "Randonnée sauvage magnifique, très peu de monde. Attention au vent sur la pointe.", ago: 19 * day },
          { userId: theo, rating: 4, comment: "Superbe coin caché, on y va rarement sans croiser personne. Sentier parfois glissant.", ago: 5 * day },
        ],
      },
      {
        creatorId: nicolas,
        title: "Île des Embiez",
        description:
          "Petite île privée au large du Brusc, accessible en 7 minutes de navette. Marais salants, criques de galets, sentiers ombragés et le petit village autour du port font de ce site un condensé de Méditerranée préservée, propriété de la famille Ricard depuis les années 1950.",
        latitude: 43.0692,
        longitude: 5.7847,
        city: "Six-Fours-les-Plages",
        photos: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/%C3%8Ele_des_Embiez%2C_marais_salants.jpg/1280px-%C3%8Ele_des_Embiez%2C_marais_salants.jpg",
          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/%C3%8Ele_des_Embiez%2C_vue_sur_le_Grand_Rouveau.jpg/1280px-%C3%8Ele_des_Embiez%2C_vue_sur_le_Grand_Rouveau.jpg",
        ],
        tags: ["Plage", "Nature"],
        ago: 22 * day,
        reviews: [
          { userId: julie, rating: 5, comment: "Journée parfaite en famille, les criques sont magnifiques et l'eau limpide. Location de vélos sur place.", ago: 20 * day },
          { userId: camille, rating: 4, comment: "Dépaysement total à deux pas de Toulon. Prévoir le pique-nique, les prix sur l'île sont élevés.", ago: 13 * day },
          { userId: marie, rating: 5, comment: "Le tour de l'îlot du Grand Rouveau en fin de journée est superbe, lumière incroyable.", ago: 1 * day },
        ],
      },
      {
        creatorId: camille,
        title: "Presqu'île de Saint-Mandrier",
        description:
          "À la pointe sud de la petite rade de Toulon, cette presqu'île autrefois rattachée au continent par un mince cordon de sable offre des vues rares sur les deux rades. Le port de plaisance et les ruelles du village gardent une ambiance de bout du monde, à quelques minutes en bateau-bus de Toulon.",
        latitude: 43.0648,
        longitude: 5.9327,
        city: "Saint-Mandrier-sur-Mer",
        photos: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Petite_rade_Toulon_vue_de_Saint-Mandrier-sur-Mer.jpg/1280px-Petite_rade_Toulon_vue_de_Saint-Mandrier-sur-Mer.jpg",
          "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Saint_Mandrier_vue_du_faron.jpg/1280px-Saint_Mandrier_vue_du_faron.jpg",
        ],
        tags: ["Panorama", "Coucher de soleil"],
        ago: 18 * day,
        reviews: [
          { userId: sofia, rating: 5, comment: "Prendre le bateau-bus depuis Toulon plutôt que la voiture, la traversée est un spectacle à elle seule.", ago: 16 * day },
          { userId: nicolas, rating: 4, comment: "Village paisible avec une vue superbe sur la rade. Peu de commerces mais c'est ce qui fait son charme.", ago: 7 * day },
        ],
      },
      {
        creatorId: julie,
        title: "Chapelle Notre-Dame-du-Mai",
        description:
          "Point culminant de la presqu'île du Cap Sicié à 358m, cette chapelle du 17e siècle domine tout le littoral varois. Le panorama à 360° va des calanques de Marseille aux îles d'Hyères par temps clair. Un lieu de pèlerinage historique devenu aussi un incontournable pour les randonneurs.",
        latitude: 43.0736,
        longitude: 5.8394,
        city: "Six-Fours-les-Plages",
        photos: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Chapelle_Notre-Dame_Mai_Six_Fours_Plages_1.jpg/1280px-Chapelle_Notre-Dame_Mai_Six_Fours_Plages_1.jpg",
          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Cap_Sici%C3%A9%2C_Les_Embiez%2C_depuis_Notre-Dame_du_Mai%2C_Six-Fours-les-Plages%2C_Var.jpg/1280px-Cap_Sici%C3%A9%2C_Les_Embiez%2C_depuis_Notre-Dame_du_Mai%2C_Six-Fours-les-Plages%2C_Var.jpg",
        ],
        tags: ["Panorama", "Patrimoine"],
        ago: 28 * day,
        reviews: [
          { userId: theo, rating: 5, comment: "Montée courte mais qui grimpe, récompensée par une vue à 360° incroyable. À faire au lever du jour.", ago: 24 * day },
          { userId: emma, rating: 5, comment: "On voit les Embiez, Cap Sicié et même les îles d'Hyères par temps dégagé. Vraiment impressionnant.", ago: 17 * day },
          { userId: lucas, rating: 4, comment: "Chapelle chargée d'histoire, le sentier est bien balisé depuis le parking.", ago: 9 * day },
        ],
      },
      {
        creatorId: marie,
        title: "Rade de Toulon depuis les quais",
        description:
          "Le port militaire et le port de plaisance de Toulon, entre bâtiments de la Marine nationale et voiliers, avec le Mont Faron en toile de fond. Le marché du cours Lafayette et les quais animés font de ce coin du centre-ville un passage obligé pour sentir le vrai Toulon.",
        latitude: 43.1197,
        longitude: 5.9297,
        city: "Toulon",
        photos: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Gloire_du_ciel_sur_le_port_de_Toulon_%284365214817%29.jpg/1280px-Gloire_du_ciel_sur_le_port_de_Toulon_%284365214817%29.jpg",
          "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Harbour_control_Toulon_-_panoramio.jpg/1280px-Harbour_control_Toulon_-_panoramio.jpg",
        ],
        tags: ["Urbain", "Patrimoine"],
        ago: 8 * day,
        reviews: [
          { userId: nicolas, rating: 4, comment: "Belle balade sur les quais, on peut voir les bâtiments de la Marine de très près.", ago: 6 * day },
          { userId: sofia, rating: 5, comment: "Le marché du matin puis un café sur le port, un vrai bon moment toulonnais.", ago: 3 * day },
        ],
      },
      {
        creatorId: emma,
        title: "Plage des Sablettes",
        description:
          "Longue plage de sable fin à La Seyne-sur-Mer, bordée par le Grand Hôtel des Sablettes, magnifique bâtisse Belle Époque restaurée. Vue dégagée sur la rade et le Cap Sicié, ambiance familiale avec de nombreux commerces le long du front de mer.",
        latitude: 43.0898,
        longitude: 5.8776,
        city: "La Seyne-sur-Mer",
        photos: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Mobeye-%C3%89t%C3%A9DesVilles-La_Seyne-sur-Mer-757.jpg/1280px-Mobeye-%C3%89t%C3%A9DesVilles-La_Seyne-sur-Mer-757.jpg",
          "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Le_Grand_Hotel_des_Sablettes.JPG/1280px-Le_Grand_Hotel_des_Sablettes.JPG",
        ],
        tags: ["Plage", "Patrimoine"],
        ago: 14 * day,
        reviews: [
          { userId: camille, rating: 4, comment: "Grande plage bien équipée, parfaite en famille. Le Grand Hôtel en arrière-plan est magnifique.", ago: 12 * day },
          { userId: julie, rating: 5, comment: "Sable fin et vue sur le Cap Sicié, on peut louer paddle et kayak sur place.", ago: 4 * day },
          { userId: marie, rating: 4, comment: "Beaucoup de monde en été mais la plage est longue donc on trouve toujours sa place.", ago: 1 * day },
        ],
      },
    ];

    let spotCount = 0;
    let reviewCount = 0;

    for (const spot of spots) {
      const spotId = await ctx.db.insert("spots", {
        creatorId: spot.creatorId,
        title: spot.title,
        description: spot.description,
        latitude: spot.latitude,
        longitude: spot.longitude,
        city: spot.city,
        photos: spot.photos,
        tags: spot.tags,
        createdAt: now - spot.ago,
      });
      spotCount++;

      for (const review of spot.reviews) {
        await ctx.db.insert("reviews", {
          spotId,
          userId: review.userId,
          rating: review.rating,
          comment: review.comment,
          createdAt: now - review.ago,
        });
        reviewCount++;
      }
    }

    return { message: `${spotCount} spots créés avec ${reviewCount} avis.` };
  },
});
