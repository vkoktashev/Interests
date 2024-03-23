import React from 'react';
import SearchAutocomplete from '@/features/search/ui/SearchAutocomplete/SearchAutocomplete';
import styles from './Header.module.scss';

function Header() {
    return (
        <nav className={styles.Header}>
            <div>
                <button>

                </button>
            </div>
            <SearchAutocomplete />
            <div>

            </div>
        </nav>
    );
}

export default Header;
