"""Utility functions and helpers."""

from typing import List


def explain_letter(letter: str, dots: List[int]) -> str:
    """Generate spoken explanation for a letter's Braille pattern.
    
    Args:
        letter: The letter to explain
        dots: List of 6 dot values (1 or 0)
        
    Returns:
        str: Human-readable explanation
    """
    active_dots = [i + 1 for i, dot in enumerate(dots) if dot == 1]
    
    if not active_dots:
        return f"Letter {letter.upper()}: no dots"
    elif len(active_dots) == 1:
        return f"Letter {letter.upper()}: dot {active_dots[0]}"
    else:
        dots_str = ", ".join(map(str, active_dots[:-1]))
        return f"Letter {letter.upper()}: dots {dots_str}, and {active_dots[-1]}"
