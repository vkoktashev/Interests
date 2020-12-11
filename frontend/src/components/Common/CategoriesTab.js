import React, {useState} from "react";
import './style.css';

function CategoriesTab( {categories, activeColor, onChangeCategory} ) {
    const [activeCategory, setActiveCategory] = useState(categories[0]);

    return(
        <div>
            {categories.map((category) => <button className={'categoriesTab'} 
                                            key={category}
                                            style={{color: (activeCategory === category?activeColor:'rgb(207, 207, 207)')}}
                                            onClick={()=>{ 
                                                setActiveCategory(category);
                                                onChangeCategory(category);
                                            }}>
                                            {category}
                                        </button>) }
            <br/>
           <hr style={{  backgroundColor: activeColor, height: 2.5, marginTop: "-16px", marginBottom: "-10px" }}/>`
        </div>  
    )
}

export default CategoriesTab;
