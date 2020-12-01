import re
from difflib import SequenceMatcher


def similar(a, b):
    """ This function calculate how much the first string is similar to the second string
    :param a: First String
    :param b: Second String
    :return: Return the similarity between the two string (0.0-1.0)
    """

    game_name_numbers = []
    for word in a.split(" "):
        if word.isdigit():
            game_name_numbers.append(word)

    if a is None or b is None:
        return 0
    similarity = SequenceMatcher(None, a, b).ratio()
    if game_name_numbers is not None and len(game_name_numbers) > 0:  # additional check about numbers in the string
        number_found = False
        cleaned = re.sub(r'([^\s\w]|_)+', '', b)
        for word in cleaned.split(" "):  # check for every word
            if word.isdigit():  # if is a digit
                for number_entry in game_name_numbers:  # compare it with numbers in the begin string
                    if str(number_entry) == str(word):
                        number_found = True
                        break
        if not number_found:  # number in the given string not in this one, reduce prob
            similarity -= 0.1
    return similarity
