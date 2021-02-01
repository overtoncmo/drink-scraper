// pl-scraper.js

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const urls = ['https://iba-world.com/iba-cocktails/',
              'https://iba-world.com/contemporary-classics/',
              'https://iba-world.com/new-era-drinks/'];

let drinks = [];
let counter = 0;
let errors = [];

fs.unlink('drinks.csv', function (err) {
  if (err) console.log('File does not exist.');
  else console.log('File cleared!');
});


urls.forEach((url) => {
  axios(url)
    .then(response => {
      const html = response.data;
      const $ = cheerio.load(html);
      const drinkElems = $('.blog_list_item_lists > .row > div:has(h3)');

      drinkElems.each(function() {
        const readMoreLink = $(this).find('a').attr('href');
        axios(readMoreLink)
          .then(response => {
            const html = response.data;
            const $ = cheerio.load(html);
            const drinkElems = $('.content > .row > div:has(h1)');


            drinkElems.each(function() {
                drinkName = $(this).find('h1').text();
                drinkInfo = $(this).find('p').text();
                drink = {
                  name: drinkName,
                  ...parseRecipe(JSON.stringify(drinkInfo))
                };
                drinks.push(drink);
                writeDrinkToCsv(drink);
                printDrink(drink);
            });
          })
          .catch(console.error);

        recipe = JSON.stringify($(this).find('.blog_text > p').text());
      });
    })
    .catch(console.error);
});






function parseRecipe(str) {
      str = str.toLowerCase();
      const ingredientRegex = /ingredients/g;
      const suffixes = ['of', '']
      const measurements = ['ml', 'dashes', 'dash', 'bar spoons', 'bar spoon', 'teaspoons', 'teaspoon', 'tsp', 'top up'];
      const methodRegex = /method/g;
      const garnishRegex = /garnish/g;

      let ingredientIndex = str.search(ingredientRegex);
      let methodIndex = str.search(methodRegex);
      let garnishIndex = str.search(garnishRegex);
      if (garnishIndex === -1) { garnishIndex = str.length; };

      let amounts = new Map();

      str.substring(ingredientIndex + 'ingredients'.length, methodIndex)
         .split('\\n')
         .filter((el) => el !== '')
         .forEach(function (line) {
             let processed = false;
             measurements.forEach(function(measurement) {
                suffixes.forEach(function(suffix) {
                  if (line.includes(measurement+suffix) && !processed) {
                      processed = true;
                      let parts = line.split(measurement+suffix);
                      if (parts.length === 2) {
                          let amount = {
                            number: parts[0].trim(),
                            unit: measurement
                          };
                          amounts.set(parts[1].trim(), amount);
                      } else if (parts.length == 1) {
                          amounts.set(parts[0], 'N/A')
                      } else {
                        amounts.set(line, 'Error! Length is ' + parts.length.toString());
                      }
                    }
                });
             });
         });

      method = str.substring(methodIndex + 8, garnishIndex)
                   .replaceAll('\\n', '');

      garnish = str.substring(garnishIndex + 7)
                   .replaceAll('\\n', '');
      return {
        ingredients: amounts,
        method: method,
        garnish: garnish
      }
}


function printDrink(drink) {
    console.log(drink);
}

// TODO - format the CSV properly
function writeDrinkToCsv(drink) {

    fs.appendFile('drinks.csv', formatDrinkForCsv(drink) + '\n',function (err) {
      if (err) throw err;
      console.log('Created ' + drink.name + ".");
    });
}

function formatDrinkForCsv(drink) {
    let name = prettify(drink.name);
    let ingredients = '';
    let tags = tagify(name) + ' ';
    for (const [ingredient, amount] of drink.ingredients.entries()) {
        ingredients += prettify(ingredient) + ' ' + amount.number + ' ' + amount.unit + '<br>';
        tags += tagify(ingredient) + ' ';
        }
    let method = prettify(drink.method);
    let garnish = prettify(drink.garnish);


    return name + ';' + ingredients + '<br>' + method + '<br>' + garnish + ';' + tags;

}

function prettify(str) {
    return str[0].toUpperCase() + str.toLowerCase().substring(1);
}

function tagify(str) {
    return str.split(' ').join('-')
}

function parseRecipeRegex(str) {
      str = str.toLowerCase(drink);
      const ingredientRegex = /ingredients/g;
      const measurementRegex = /^[ -.,0-9/]+ ?ml |^.+of |^[ -.,0-9/]* ?[Ff]ew ?[Dd]ash[es] |.*with |[Tt]op up |^[ -.,0-9/]+ ?[Bb]ar [Ss]poons? |^[ -.,0-9/]+ ?teaspoons? |^[ -.,0-9/]+ ?tsp? |^[ -.,0-9/]+ /;
      //any combination of digits, -, /, .; or anything -> of; measurement (next thing after number); ingredient (next thing after measurement)
      const measurements = ['ml', 'dash', 'dashes', 'bar spoons', 'bar spoons', 'teaspoons', 'tsp', 'top up'];
      const methodRegex = /method/g;
      const garnishRegex = /garnish/g;

      let ingredientIndex = str.search(ingredientRegex);
      let methodIndex = str.search(methodRegex);
      let garnishIndex = str.search(garnishRegex);
      if (garnishIndex === -1) { garnishIndex = str.length; };

      let amounts = new Map();

      str.substring(ingredientIndex + 'ingredients'.length, methodIndex)
         .split('\\n')
         .filter((el) => el !== '')
         .forEach(function (str) {
             var match = str.match(measurementRegex);
             if (match) {
                 amounts.set(str.replace(match[0],''), match[0]);
             } else {
                 amounts.set(str,'N/A');
                 errors.push(str);
               };
         });

      method = str.substring(methodIndex + 8, garnishIndex)
                   .replaceAll('\\n', '');

      garnish = str.substring(garnishIndex + 7)
                   .replaceAll('\\n', '');
      return {
        ingredients: amounts,
        method: method,
        garnish: garnish
      }
}
