import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

export default function SearchableClubSelect({ clubs, selectedClubId, onSelectClub }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClubs, setFilteredClubs] = useState(clubs);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setFilteredClubs(
      clubs.filter((club) =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, clubs]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (club) => {
    onSelectClub(club.id);
    setSearchTerm(club.name);
    setIsOpen(false);
  };

  const selectedClubName = clubs.find(club => club.id === selectedClubId)?.name || '';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="relative w-full cursor-default rounded-md border border-surfaceBorder bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center">
          <input
            type="text"
            className="w-full border-none focus:ring-0 p-0 text-sm"
            value={searchTerm || selectedClubName}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onClick={(e) => e.stopPropagation()} // Prevent button's onClick from firing when input is clicked
            placeholder="Search for a club"
          />
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
          <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </button>

      {isOpen && (
        <ul
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
          tabIndex="-1"
          role="listbox"
          aria-labelledby="listbox-label"
        >
          {filteredClubs.length === 0 && (
            <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900">
              No clubs found.
            </li>
          )}
          {filteredClubs.map((club) => (
            <li
              key={club.id}
              className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-indigo-600 hover:text-white"
              onClick={() => handleSelect(club)}
              role="option"
              aria-selected={club.id === selectedClubId}
            >
              {club.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}